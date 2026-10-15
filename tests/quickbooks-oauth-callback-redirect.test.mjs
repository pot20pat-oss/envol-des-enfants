import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const source = readFileSync(new URL("../app/api/quickbooks/callback/route.ts", import.meta.url), "utf8");
const start = source.indexOf("type OAuthOutcome =");
assert.ok(start >= 0, "callback redirect helper must exist");
const compiled = stripTypeScriptTypes(source.slice(start), { mode: "strip" })
  .replace("export async function GET", "async function GET");

function harness({ stateMatches = true, stateConsumed = true, oauthFailure = false, saveAllowed = true } = {}) {
  const state = "a".repeat(64);
  const logs = [];
  const queries = [];
  const db = {
    prepare(sql) {
      return {
        bind(...params) {
          queries.push({ sql, params });
          return {
            async run() {
              if (sql.startsWith("DELETE FROM quickbooks_oauth_states")) {
                return { meta: { changes: Number(stateConsumed) } };
              }
              if (sql.startsWith("INSERT INTO quickbooks_connections")) {
                return { meta: { changes: Number(saveAllowed) } };
              }
              throw new Error("Unexpected SQL query: " + sql);
            },
          };
        },
      };
    },
  };
  const deps = {
    cmsEnv: () => ({ DB: db }),
    clearStateCookie: "qb_oauth_state=; Path=/api/quickbooks/callback; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
    encryptSandboxTokens: async () => "encrypted-token-envelope",
    exchangeAuthorizationCode: async () => {
      if (oauthFailure) throw new Error("TOP_SECRET_OAUTH_VALUE");
      return { access_token: "dummy", refresh_token: "dummy", expires_in: 3600, x_refresh_token_expires_in: 7200 };
    },
    sandboxCredentials: () => ({ clientId: "test", clientSecret: "test", tokenEncryptionKey: "test" }),
    stateCookie: () => stateMatches ? state : null,
    stateHash: async () => "hashed-state",
    SANDBOX_REVOCATION_FENCE: "quickbooks:sandbox:revocation-pending",
  };
  const fakeConsole = { error: (...args) => logs.push(args.join(" ")) };
  const GET = new Function("deps", "Response", "URL", "console", `
    const {
      cmsEnv, clearStateCookie, encryptSandboxTokens, exchangeAuthorizationCode,
      sandboxCredentials, stateCookie, stateHash, SANDBOX_REVOCATION_FENCE
    } = deps;
    ${compiled}
    return GET;
  `)(deps, Response, URL, fakeConsole);
  const request = (search = "") =>
    new Request("https://envoldesenfants.com/api/quickbooks/callback?" + search);
  const query = "state=" + state + "&code=TOP_SECRET_OAUTH_VALUE&realmId=123456";
  return { GET, request, query, logs, queries };
}

function checkRedirect(response, expectedStatus) {
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://envoldesenfants.com/admin?quickbooks=sandbox-" + expectedStatus);
  assert.match(response.headers.get("cache-control") || "", /no-store/);
  assert.match(response.headers.get("set-cookie") || "", /Max-Age=0/);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.doesNotMatch(response.headers.get("location"), /state=|code=|realmId=|TOP_SECRET/);
}

test("invalid OAuth state cleans callback URL without touching DB", async () => {
  const h = harness({ stateMatches: false });
  const result = await h.GET(h.request(h.query));
  checkRedirect(result, "invalid-state");
  assert.equal(h.queries.length, 0);
});

test("already consumed OAuth state fails closed and clears URL", async () => {
  const h = harness({ stateConsumed: false });
  checkRedirect(await h.GET(h.request(h.query)), "expired-state");
});

test("Intuit denial redirects without reflecting upstream error", async () => {
  const h = harness();
  checkRedirect(await h.GET(h.request(h.query + "&error=access_denied&error_description=TOP_SECRET")), "cancelled");
});

test("token-exchange failures never log secret details or leave code in URL", async () => {
  const h = harness({ oauthFailure: true });
  checkRedirect(await h.GET(h.request(h.query)), "failed");
  assert.equal(h.logs.length, 1);
  assert.doesNotMatch(h.logs[0], /TOP_SECRET_OAUTH_VALUE/);
});

test("revocation fence prevents reconnect and produces safe callback URL", async () => {
  const h = harness({ saveAllowed: false });
  checkRedirect(await h.GET(h.request(h.query)), "revocation-pending");
});

test("successful callback keeps existing sandbox destination", async () => {
  const h = harness();
  const result = await h.GET(h.request(h.query));
  assert.equal(result.status, 303);
  assert.equal(result.headers.get("location"), "https://envoldesenfants.com/admin?quickbooks=sandbox-connected");
  assert.equal(h.queries.filter(x => x.sql.startsWith("INSERT INTO quickbooks_connections")).length, 1);
});
