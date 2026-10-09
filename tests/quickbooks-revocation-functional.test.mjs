import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const source = readFileSync(new URL("../app/api/quickbooks/disconnect/route.ts", import.meta.url), "utf8")
  .replace(/^[\s\S]*?(?=const REVOKE_URL =)/, "");
const compiled = stripTypeScriptTypes(source, { mode: "strip" }).replace("export async function POST", "async function POST");

function createHarness(revokeHandler) {
  let fence = false;
  let connection = { realm_id: "sandbox-123", encrypted_tokens: "cipher-one" };
  const queries = [];
  const db = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              queries.push({ sql, args });
              if (sql.startsWith("INSERT OR IGNORE INTO quickbooks_oauth_states")) {
                if (fence) return { meta: { changes: 0 } };
                fence = true;
                return { meta: { changes: 1 } };
              }
              if (sql.startsWith("DELETE FROM quickbooks_oauth_states")) {
                const changed = Number(fence);
                fence = false;
                return { meta: { changes: changed } };
              }
              if (sql.startsWith("DELETE FROM quickbooks_connections")) {
                if (!connection || connection.realm_id !== args[0] || connection.encrypted_tokens !== args[1])
                  return { meta: { changes: 0 } };
                connection = null;
                return { meta: { changes: 1 } };
              }
              throw Error("Unexpected run SQL: " + sql);
            }
          };
        },
        async first() {
          if (sql.startsWith("SELECT realm_id,encrypted_tokens FROM quickbooks_connections")) return connection && { ...connection };
          throw Error("Unexpected first SQL: " + sql);
        }
      };
    }
  };
  const dependencies = {
    cmsEnv: () => ({ DB: db }),
    currentAdmin: async () => ({ id: "admin" }),
    forbidden: () => new Response(null, { status: 401 }),
    sandboxCredentials: () => ({ clientId: "dummy", clientSecret: "dummy", tokenEncryptionKey: "dummy" }),
    decryptSandboxTokens: async () => ({ refresh_token: "FAKE-REFRESH-NOT-REAL" }),
    SANDBOX_REVOCATION_FENCE: "quickbooks:sandbox:revocation-pending",
  };
  const POST = new Function("deps", "fakeFetch", "Response", "AbortSignal", `
    const { cmsEnv, currentAdmin, forbidden, sandboxCredentials, decryptSandboxTokens, SANDBOX_REVOCATION_FENCE } = deps;
    const fetch = fakeFetch;
    ${compiled}
    return POST;
  `)(dependencies, revokeHandler, Response, AbortSignal);
  function request(realmId = "sandbox-123") {
    return new Request("https://envoldesenfants.com/api/quickbooks/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin", Origin: "https://envoldesenfants.com" },
      body: JSON.stringify({ confirm: "REVOKE_SANDBOX_QUICKBOOKS", realmId })
    });
  }
  return {
    POST, request, queries,
    get fence() { return fence; },
    get connection() { return connection; },
    rotateTokens() { if (connection) connection.encrypted_tokens = "cipher-two"; }
  };
}

test("successful revocation removes original connection and releases fence", async () => {
  let calls = 0;
  const h = createHarness(async (_, init) => {
    calls++;
    assert.equal(JSON.parse(init.body).token, "FAKE-REFRESH-NOT-REAL");
    return new Response("{}", { status: 200 });
  });
  const response = await h.POST(h.request());
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
  assert.equal(h.fence, false);
  assert.equal(h.connection, null);
});

test("two revocations cannot run concurrently; second is rejected without calling Intuit", async () => {
  let unblock;
  let started;
  const startedPromise = new Promise(resolve => { started = resolve; });
  const gate = new Promise(resolve => { unblock = resolve; });
  let calls = 0;
  const h = createHarness(async () => {
    calls++;
    started();
    await gate;
    return new Response("{}", { status: 200 });
  });
  const first = h.POST(h.request());
  await startedPromise;
  assert.equal(h.fence, true);
  const second = await h.POST(h.request());
  assert.equal(second.status, 409);
  assert.equal(calls, 1);
  unblock();
  assert.equal((await first).status, 200);
});

test("Intuit network failure retains fence and connection, preventing automatic retry", async () => {
  const h = createHarness(async () => { throw Error("Mocked network error"); });
  assert.equal((await h.POST(h.request())).status, 502);
  assert.equal(h.fence, true);
  assert.ok(h.connection);
  assert.equal((await h.POST(h.request())).status, 409);
});

test("concurrent token change is not deleted; connection requires administrator review", async () => {
  const h = createHarness(async () => {
    h.rotateTokens();
    return new Response("{}", { status: 200 });
  });
  assert.equal((await h.POST(h.request())).status, 409);
  assert.equal(h.fence, true);
  assert.equal(h.connection.encrypted_tokens, "cipher-two");
});

test("wrong company does not call Intuit and releases fence", async () => {
  const h = createHarness(async () => { throw Error("Should never call Intuit"); });
  assert.equal((await h.POST(h.request("wrong-company"))).status, 409);
  assert.equal(h.fence, false);
  assert.ok(h.connection);
});
