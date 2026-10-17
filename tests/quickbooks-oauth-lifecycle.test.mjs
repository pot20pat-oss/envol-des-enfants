import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const DISCOVERY_URL = "https://developer.api.intuit.com/.well-known/openid_sandbox_configuration";
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const TOKEN_KEY = Buffer.from(new Uint8Array(32).fill(7)).toString("base64");
const CREDENTIALS = { clientId: "test-client", clientSecret: "test-secret", tokenEncryptionKey: TOKEN_KEY };

const oauthSource = readFileSync(new URL("../lib/quickbooks-oauth.ts", import.meta.url), "utf8")
  .replace(/^import \{ cmsEnv \}.*$/m, "");
const oauthCompiled = stripTypeScriptTypes(oauthSource, { mode: "strip" })
  .replace(/^export /gm, "");

function createDb() {
  const state = { connection: null, fence: false };
  const db = {
    prepare(sql) {
      const stmt = {
        args: [],
        bind(...args) { stmt.args = args; return stmt; },
        async first() {
          if (sql.includes("FROM quickbooks_connections")) return state.connection && { ...state.connection };
          if (sql.includes("FROM quickbooks_oauth_states")) return state.fence ? { state_hash: "fence" } : null;
          throw new Error("Unexpected first SQL: " + sql);
        },
        async run() {
          if (sql.startsWith("UPDATE quickbooks_connections")) {
            const [sealed, , realmId, previous] = stmt.args;
            if (state.fence || !state.connection ||
              state.connection.realm_id !== realmId || state.connection.encrypted_tokens !== previous) {
              return { meta: { changes: 0 } };
            }
            state.connection = { realm_id: realmId, encrypted_tokens: sealed };
            return { meta: { changes: 1 } };
          }
          throw new Error("Unexpected run SQL: " + sql);
        },
      };
      return stmt;
    },
  };
  return { db, state };
}

function loadOAuth(db) {
  const cmsEnv = () => ({
    QUICKBOOKS_MODE: "sandbox",
    QUICKBOOKS_CLIENT_ID: CREDENTIALS.clientId,
    QUICKBOOKS_CLIENT_SECRET: CREDENTIALS.clientSecret,
    QUICKBOOKS_TOKEN_KEY: TOKEN_KEY,
    DB: db,
  });
  return new Function("cmsEnv", `
    ${oauthCompiled}
    return { createAuthorizeUrl, randomState, stateHash, exchangeAuthorizationCode,
      encryptSandboxTokens, decryptSandboxTokens, accessTokenForSandbox,
      fetchTokenWithControlledRetry, resolveIntuitOAuthEndpoints, resetIntuitDiscoveryCache,
      QuickBooksReconnectRequiredError, isQuickBooksReconnectRequired,
      INTUIT_SANDBOX_DISCOVERY_URL, INTUIT_OAUTH_FALLBACK_ENDPOINTS };
  `)(cmsEnv);
}

function jsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}

function discoveryResponse(overrides = {}) {
  return jsonResponse(200, {
    issuer: "https://oauth.platform.intuit.com/op/v1",
    authorization_endpoint: "https://appcenter.intuit.com/connect/oauth2",
    token_endpoint: TOKEN_URL,
    revocation_endpoint: "https://developer.api.intuit.com/v2/oauth2/tokens/revoke",
    ...overrides,
  });
}

/** Router: discovery succeeds with the official document, token calls go to onToken. */
function intuitFetch(onToken, calls) {
  return async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url) === DISCOVERY_URL) return discoveryResponse();
    return onToken(String(url), init);
  };
}
const noSleep = async () => {};
const tokenCalls = (calls) => calls.filter(c => c.url === TOKEN_URL);

test("Q5: Discovery document resolves the official Intuit endpoints", async () => {
  const { db } = createDb();
  const oauth = loadOAuth(db);
  assert.equal(oauth.INTUIT_SANDBOX_DISCOVERY_URL, DISCOVERY_URL);
  const calls = [];
  const endpoints = await oauth.resolveIntuitOAuthEndpoints({
    fetchImpl: async (url) => { calls.push(String(url)); return discoveryResponse(); },
  });
  assert.deepEqual(calls, [DISCOVERY_URL]);
  assert.deepEqual(endpoints, oauth.INTUIT_OAUTH_FALLBACK_ENDPOINTS);
  const authorize = new URL(oauth.createAuthorizeUrl("cid", "a".repeat(64), endpoints.authorizationEndpoint));
  assert.equal(authorize.origin + authorize.pathname, endpoints.authorizationEndpoint);
  assert.equal(authorize.searchParams.get("response_type"), "code");
});

test("Q5: unreachable or unexpected Discovery falls back without breaking OAuth", async () => {
  const { db } = createDb();
  const oauth = loadOAuth(db);
  const down = await oauth.resolveIntuitOAuthEndpoints({
    cacheDiscovery: false,
    fetchImpl: async () => { throw new Error("network down"); },
  });
  assert.deepEqual(down, oauth.INTUIT_OAUTH_FALLBACK_ENDPOINTS);
  oauth.resetIntuitDiscoveryCache();
  const hostile = await oauth.resolveIntuitOAuthEndpoints({
    cacheDiscovery: false,
    fetchImpl: async () => discoveryResponse({ token_endpoint: "https://evil.example/token" }),
  });
  assert.deepEqual(hostile, oauth.INTUIT_OAUTH_FALLBACK_ENDPOINTS);
});

test("Q3: temporary 5xx/429 token errors are retried with backoff and Retry-After", async () => {
  const { db } = createDb();
  const oauth = loadOAuth(db);
  const delays = [];
  const queue = [
    jsonResponse(500, {}),
    jsonResponse(429, {}, { "Retry-After": "2" }),
    jsonResponse(200, { ok: true }),
  ];
  let calls = 0;
  const response = await oauth.fetchTokenWithControlledRetry(TOKEN_URL, { method: "POST" }, {
    fetchImpl: async () => queue[calls++],
    sleep: async (ms) => { delays.push(ms); },
  });
  assert.equal(response.status, 200);
  assert.equal(calls, 3);
  assert.deepEqual(delays, [250, 2000]);
});

test("Q3: retries are bounded and network errors are retried once before success", async () => {
  const { db } = createDb();
  const oauth = loadOAuth(db);
  let calls = 0;
  const exhausted = await oauth.fetchTokenWithControlledRetry(TOKEN_URL, {}, {
    fetchImpl: async () => { calls++; return jsonResponse(503, {}); },
    sleep: noSleep,
  });
  assert.equal(exhausted.status, 503);
  assert.equal(calls, 3);
  calls = 0;
  const recovered = await oauth.fetchTokenWithControlledRetry(TOKEN_URL, {}, {
    fetchImpl: async () => { if (++calls === 1) throw new Error("socket reset"); return jsonResponse(200, {}); },
    sleep: noSleep,
  });
  assert.equal(recovered.status, 200);
  assert.equal(calls, 2);
});

test("Q6c: invalid_grant on refresh demands reconnection, is never retried, tokens untouched", async () => {
  const { db, state } = createDb();
  const oauth = loadOAuth(db);
  const sealed = await oauth.encryptSandboxTokens(TOKEN_KEY, "12345", {
    access_token: "old-access", refresh_token: "dead-refresh", expires_in: -60, x_refresh_token_expires_in: 86_400_000,
  });
  state.connection = { realm_id: "12345", encrypted_tokens: sealed };
  const calls = [];
  await assert.rejects(
    oauth.accessTokenForSandbox({
      fetchImpl: intuitFetch(async () => jsonResponse(400, { error: "invalid_grant", error_description: "Token revoked" }), calls),
      sleep: noSleep,
    }),
    (error) => {
      assert.ok(error instanceof oauth.QuickBooksReconnectRequiredError);
      assert.equal(error.oauthError, "invalid_grant");
      assert.equal(error.requiresReconnect, true);
      assert.match(error.message, /reconnect/i);
      return true;
    },
  );
  assert.equal(tokenCalls(calls).length, 1, "invalid_grant must not be retried");
  assert.equal(state.connection.encrypted_tokens, sealed, "stored tokens must not be overwritten");
  assert.equal(oauth.isQuickBooksReconnectRequired(new oauth.QuickBooksReconnectRequiredError("invalid_grant")), true);
  assert.equal(oauth.isQuickBooksReconnectRequired(new Error("boom")), false);
});

test("Q6b: locally expired refresh token demands reconnection without calling Intuit", async () => {
  const { db, state } = createDb();
  const oauth = loadOAuth(db);
  state.connection = {
    realm_id: "12345",
    encrypted_tokens: await oauth.encryptSandboxTokens(TOKEN_KEY, "12345", {
      access_token: "old-access", refresh_token: "expired-refresh", expires_in: -60, x_refresh_token_expires_in: -1000,
    }),
  };
  const calls = [];
  await assert.rejects(
    oauth.accessTokenForSandbox({ fetchImpl: intuitFetch(async () => jsonResponse(200, {}), calls), sleep: noSleep }),
    (error) => {
      assert.ok(error instanceof oauth.QuickBooksReconnectRequiredError);
      assert.equal(error.oauthError, "refresh_token_expired");
      assert.match(error.message, /reconnect from the CMS/i);
      return true;
    },
  );
  assert.equal(tokenCalls(calls).length, 0, "no token call may be attempted with an expired refresh token");
});

test("Q1: full connect -> use -> refresh -> disconnect -> reconnect cycle (simulated Intuit)", async () => {
  const { db, state } = createDb();
  const oauth = loadOAuth(db);
  const realmId = "12345";
  const issued = [];
  const calls = [];
  const fetchImpl = intuitFetch(async (url, init) => {
    if (url.includes("/tokens/revoke")) {
      assert.equal(JSON.parse(String(init.body)).token, "refresh-B");
      return jsonResponse(200, {});
    }
    const grant = new URLSearchParams(String(init.body)).get("grant_type");
    if (grant === "authorization_code") {
      const tokens = { access_token: "access-A", refresh_token: "refresh-A", expires_in: 3600, x_refresh_token_expires_in: 7_776_000 };
      issued.push(tokens);
      return jsonResponse(200, tokens);
    }
    if (grant === "refresh_token") {
      return jsonResponse(200, { access_token: "access-B", refresh_token: "refresh-B", expires_in: 3600, x_refresh_token_expires_in: 7_776_000 });
    }
    throw new Error("unexpected grant " + grant);
  }, calls);
  const options = { fetchImpl, sleep: noSleep };

  // Connect: authorize URL carries the CSRF state issued for this attempt.
  const stateValue = oauth.randomState();
  const authorize = new URL(oauth.createAuthorizeUrl(CREDENTIALS.clientId, stateValue));
  assert.equal(authorize.searchParams.get("state"), stateValue);
  assert.equal(authorize.searchParams.get("client_id"), CREDENTIALS.clientId);

  // Callback equivalent: exchange the code and persist sealed tokens.
  const exchanged = await oauth.exchangeAuthorizationCode("fake-code", CREDENTIALS, options);
  state.connection = { realm_id: realmId, encrypted_tokens: await oauth.encryptSandboxTokens(TOKEN_KEY, realmId, exchanged) };

  // Valid access token is served without any token-endpoint call.
  calls.length = 0;
  assert.deepEqual(await oauth.accessTokenForSandbox(options), { realmId, accessToken: "access-A" });
  assert.equal(tokenCalls(calls).length, 0);

  // Access token expired: refresh rotates and persists the new pair.
  state.connection.encrypted_tokens = await oauth.encryptSandboxTokens(TOKEN_KEY, realmId, {
    access_token: "access-A", refresh_token: "refresh-A", expires_in: -60, x_refresh_token_expires_in: 7_776_000,
  });
  assert.deepEqual(await oauth.accessTokenForSandbox(options), { realmId, accessToken: "access-B" });
  const persisted = await oauth.decryptSandboxTokens(TOKEN_KEY, realmId, state.connection.encrypted_tokens);
  assert.equal(persisted.refresh_token, "refresh-B");

  // Disconnect equivalent: revoke the refresh token, then drop the connection.
  const endpoints = await oauth.resolveIntuitOAuthEndpoints(options);
  const revoke = await fetchImpl(endpoints.revocationEndpoint, { method: "POST", body: JSON.stringify({ token: persisted.refresh_token }) });
  assert.equal(revoke.status, 200);
  state.connection = null;
  assert.equal(await oauth.accessTokenForSandbox(options), null);

  // Reconnect: a fresh authorization restores service.
  const reconnected = await oauth.exchangeAuthorizationCode("fake-code-2", CREDENTIALS, options);
  state.connection = { realm_id: realmId, encrypted_tokens: await oauth.encryptSandboxTokens(TOKEN_KEY, realmId, reconnected) };
  assert.deepEqual(await oauth.accessTokenForSandbox(options), { realmId, accessToken: "access-A" });
});

test("Q5: revocation endpoint in disconnect matches the Discovery document", () => {
  const disconnect = readFileSync(new URL("../app/api/quickbooks/disconnect/route.ts", import.meta.url), "utf8");
  assert.match(disconnect, /const REVOKE_URL = "https:\/\/developer\.api\.intuit\.com\/v2\/oauth2\/tokens\/revoke"/);
});

function loadStatus(oauth, accessTokenForSandbox) {
  const source = readFileSync(new URL("../app/api/quickbooks/status/route.ts", import.meta.url), "utf8")
    .replace(/^import .*$/gm, "");
  const compiled = stripTypeScriptTypes(source, { mode: "strip" })
    .replace("export async function GET", "async function GET");
  return new Function("deps", `
    const { currentAdmin, forbidden, accessTokenForSandbox, isQuickBooksReconnectRequired } = deps;
    ${compiled}
    return GET;
  `)({
    currentAdmin: async () => ({ id: "admin" }),
    forbidden: () => new Response(null, { status: 401 }),
    accessTokenForSandbox,
    isQuickBooksReconnectRequired: oauth.isQuickBooksReconnectRequired,
  });
}

test("Q4: status route explicitly asks for reconnection on dead OAuth grants", async () => {
  const { db } = createDb();
  const oauth = loadOAuth(db);
  const GET = loadStatus(oauth, async () => { throw new oauth.QuickBooksReconnectRequiredError("invalid_grant"); });
  const response = await GET(new Request("https://envoldesenfants.com/api/quickbooks/status"));
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.requires_reconnect, true);
  assert.equal(body.reconnect_url, "/api/quickbooks/connect");
  assert.match(body.error, /Reconnectez QuickBooks/);
});

test("Q4: status route keeps its generic error for non-OAuth failures", async () => {
  const { db } = createDb();
  const oauth = loadOAuth(db);
  const GET = loadStatus(oauth, async () => { throw new Error("database unavailable"); });
  const response = await GET(new Request("https://envoldesenfants.com/api/quickbooks/status"));
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.requires_reconnect, undefined);
});
