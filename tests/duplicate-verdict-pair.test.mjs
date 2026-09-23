import assert from "node:assert/strict";
import test from "node:test";
import { canonicalDuplicatePair } from "../lib/duplicate-verdict-pair.ts";

test("une paire a la même clé dans les deux sens", () => {
  const a = canonicalDuplicatePair("b", "a");
  const b = canonicalDuplicatePair("a", "b");
  assert.deepEqual(a,b);
  assert.equal(a?.key, '["a","b"]');
});
test("normalise les espaces sans modifier les identifiants", () => {
  assert.deepEqual(canonicalDuplicatePair(" b ", " a "), {first:"a",second:"b",key:'["a","b"]'});
});
test("refuse les paires invalides", () => {
  for (const [a,b] of [["a","a"],[" a ","a"],["","b"],["a"," "],[null,"b"],["a",1],["a".repeat(129),"b"]]) {
    assert.equal(canonicalDuplicatePair(a,b),null);
  }
});
