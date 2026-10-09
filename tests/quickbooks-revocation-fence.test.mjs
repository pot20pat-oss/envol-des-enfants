import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const oauth = readFileSync(new URL("../lib/quickbooks-oauth.ts", import.meta.url), "utf8");
const disconnect = readFileSync(new URL("../app/api/quickbooks/disconnect/route.ts", import.meta.url), "utf8");

test("OAuth sandbox uses the same revocation fence in refresh and disconnect", () => {
  assert.match(oauth, /export const SANDBOX_REVOCATION_FENCE = "quickbooks:sandbox:revocation-pending"/);
  assert.match(disconnect, /SANDBOX_REVOCATION_FENCE/);
  assert.match(oauth, /AND NOT EXISTS \(SELECT 1 FROM quickbooks_oauth_states WHERE state_hash='quickbooks:sandbox:revocation-pending'\)/);
});

test("revocation fence is claimed before remote revoke and retained on failure", () => {
  const claim = disconnect.indexOf("INSERT OR IGNORE INTO quickbooks_oauth_states");
  const revoke = disconnect.indexOf("await fetch(REVOKE_URL");
  assert.ok(claim > 0 && revoke > claim);
  assert.match(disconnect, /claimed\.meta\.changes !== 1/);
  assert.match(disconnect, /revocation fence retained/);
  const deletes = [...disconnect.matchAll(/DELETE FROM quickbooks_oauth_states/g)];
  assert.equal(deletes.length, 2, "only mismatched company and successful revocation clear fence");
});

test("access tokens are encrypted and original token cannot be overwritten on conflict", () => {
  assert.match(oauth, /name: "AES-GCM"/);
  assert.match(oauth, /update\.meta\.changes === 1/);
  assert.match(disconnect, /AND encrypted_tokens=\?/);
});
