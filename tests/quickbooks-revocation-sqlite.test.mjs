import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

const oauth = readFileSync(new URL("../lib/quickbooks-oauth.ts", import.meta.url), "utf8");
const callback = readFileSync(new URL("../app/api/quickbooks/callback/route.ts", import.meta.url), "utf8");
const disconnect = readFileSync(new URL("../app/api/quickbooks/disconnect/route.ts", import.meta.url), "utf8");
const fenceKey = "quickbooks:sandbox:revocation-pending";

const claimSQL = "INSERT OR IGNORE INTO quickbooks_oauth_states (state_hash,admin_id,expires_at,created_at) VALUES (?,?,?,?)";
const rotateSQL = "UPDATE quickbooks_connections SET encrypted_tokens=?,updated_at=? WHERE environment='sandbox' AND realm_id=? AND encrypted_tokens=? AND NOT EXISTS (SELECT 1 FROM quickbooks_oauth_states WHERE state_hash='quickbooks:sandbox:revocation-pending')";
const callbackSQL = "INSERT INTO quickbooks_connections (environment,realm_id,encrypted_tokens,connected_at,updated_at) SELECT 'sandbox',?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM quickbooks_oauth_states WHERE state_hash=?) ON CONFLICT(environment) DO UPDATE SET realm_id=excluded.realm_id,encrypted_tokens=excluded.encrypted_tokens,connected_at=excluded.connected_at,updated_at=excluded.updated_at WHERE NOT EXISTS (SELECT 1 FROM quickbooks_oauth_states WHERE state_hash=?)";
const deleteSQL = "DELETE FROM quickbooks_connections WHERE environment='sandbox' AND realm_id=? AND encrypted_tokens=?";

// Fail if production SQL changes without adapting this integration test.
for (const [source, fragments] of [
  [disconnect, ["INSERT OR IGNORE INTO quickbooks_oauth_states", "DELETE FROM quickbooks_connections WHERE environment='sandbox' AND realm_id=? AND encrypted_tokens=?"]],
  [oauth, ["AND NOT EXISTS (SELECT 1 FROM quickbooks_oauth_states WHERE state_hash='quickbooks:sandbox:revocation-pending')"]],
  [callback, ["SELECT 'sandbox',?,?,?,? WHERE NOT EXISTS", "WHERE NOT EXISTS (SELECT 1 FROM quickbooks_oauth_states WHERE state_hash=?)"]],
]) {
  for (const fragment of fragments) assert.ok(source.includes(fragment), "SQL source drift: " + fragment);
}

function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE quickbooks_oauth_states (
      state_hash TEXT PRIMARY KEY NOT NULL,
      admin_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE quickbooks_connections (
      environment TEXT PRIMARY KEY NOT NULL CHECK(environment='sandbox'),
      realm_id TEXT NOT NULL,
      encrypted_tokens TEXT NOT NULL,
      connected_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const stamp = "2026-10-09T12:00:00.000Z";
  const save = (token, realm = "12345") => db.prepare(callbackSQL).run(realm, token, stamp, stamp, fenceKey, fenceKey);
  const claim = () => db.prepare(claimSQL).run(fenceKey, "system:revocation", "9999-12-31T23:59:59.999Z", stamp);
  const get = () => db.prepare("SELECT * FROM quickbooks_connections WHERE environment='sandbox'").get();
  return { db, stamp, save, claim, get };
}

test("SQLite permits first connection and ordinary reconnect without fence", () => {
  const h = setup();
  try {
    assert.equal(h.save("fake-1").changes, 1);
    assert.equal(h.save("fake-2").changes, 1);
    assert.equal(h.get().encrypted_tokens, "fake-2");
  } finally { h.db.close(); }
});

test("SQLite active fence rejects new connections and updates without destroying data", () => {
  const h = setup();
  try {
    h.save("fake-1");
    assert.equal(h.claim().changes, 1);
    assert.equal(h.claim().changes, 0);
    assert.equal(h.save("fake-2").changes, 0);
    assert.equal(h.db.prepare(rotateSQL).run("fake-refreshed", h.stamp, "12345", "fake-1").changes, 0);
    assert.equal(h.get().encrypted_tokens, "fake-1");
  } finally { h.db.close(); }
});

test("SQLite interrupted revocation leaves persistent fence and blocks future reconnect", () => {
  const h = setup();
  try {
    h.save("fake-1");
    h.claim();
    // Simulated network failure: no SQL cleanup, as in the production route.
    assert.equal(h.db.prepare("SELECT COUNT(*) AS n FROM quickbooks_oauth_states WHERE state_hash=?").get(fenceKey).n, 1);
    assert.equal(h.save("fake-2").changes, 0);
    assert.equal(h.get().encrypted_tokens, "fake-1");
  } finally { h.db.close(); }
});

test("SQLite CAS prevents deletion when tokens changed before remote revoke completed", () => {
  const h = setup();
  try {
    h.save("fake-1");
    h.claim();
    h.db.prepare("UPDATE quickbooks_connections SET encrypted_tokens='fake-2' WHERE environment='sandbox'").run();
    assert.equal(h.db.prepare(deleteSQL).run("12345", "fake-1").changes, 0);
    assert.equal(h.get().encrypted_tokens, "fake-2");
  } finally { h.db.close(); }
});

test("SQLite completed revoke deletes matching connection; fence release permits reauthorize", () => {
  const h = setup();
  try {
    h.save("fake-1");
    h.claim();
    assert.equal(h.db.prepare(deleteSQL).run("12345", "fake-1").changes, 1);
    assert.equal(h.db.prepare("DELETE FROM quickbooks_oauth_states WHERE state_hash=?").run(fenceKey).changes, 1);
    assert.equal(h.save("fake-new").changes, 1);
    assert.equal(h.get().encrypted_tokens, "fake-new");
  } finally { h.db.close(); }
});
