import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const source = readFileSync(
  new URL("../app/api/quickbooks/revocation-diagnostic/route.ts", import.meta.url), "utf8",
).replace(/^[\s\S]*?(?=\/\*\* Read-only)/, "");
const compiled = stripTypeScriptTypes(source).replace("export async function GET", "async function GET");

function harness({ admin = true, pending = null, connection = null } = {}) {
  let calls = 0;
  const database = {
    prepare(sql) {
      calls++;
      return {
        bind() { return { first: async () => pending }; },
        first: async () => connection,
      };
    },
  };
  const fn = new Function("deps", "Response", `
    const { cmsEnv, currentAdmin, forbidden, SANDBOX_REVOCATION_FENCE } = deps;
    ${compiled}
    return GET;
  `)({
    cmsEnv: () => ({ DB: database }),
    currentAdmin: async () => admin ? { id: "admin" } : null,
    forbidden: () => new Response("Forbidden", { status: 401 }),
    SANDBOX_REVOCATION_FENCE: "quickbooks:sandbox:revocation-pending",
  }, Response);
  return { GET: fn, get calls() { return calls; } };
}

test("anonymous user receives no database information", async () => {
  const h = harness({ admin: false, pending: { created_at: "2026-10-09" } });
  const result = await h.GET(new Request("https://envoldesenfants.com/api/quickbooks/revocation-diagnostic"));
  assert.equal(result.status, 401);
  assert.equal(h.calls, 0);
});

test("pending fence requests manual review without exposing tokens", async () => {
  const h = harness({ pending: { created_at: "2026-10-09" }, connection: { realm_id: "123", updated_at: "2026-10-09" } });
  const result = await h.GET(new Request("https://envoldesenfants.com/api/quickbooks/revocation-diagnostic"));
  const data = await result.json();
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("Cache-Control"), "no-store");
  assert.equal(data.revocation_pending, true);
  assert.equal(data.manual_review_required, true);
  assert.equal(data.connection_present, true);
  assert.equal(data.pending_since, "2026-10-09");
  assert.equal(data.realm_id, undefined);
  assert.equal(data.encrypted_tokens, undefined);
});

test("absent fence reports no manual review requirement", async () => {
  const h = harness();
  const result = await h.GET(new Request("https://envoldesenfants.com/api/quickbooks/revocation-diagnostic"));
  const data = await result.json();
  assert.equal(data.revocation_pending, false);
  assert.equal(data.manual_review_required, false);
  assert.equal(data.connection_present, false);
});
