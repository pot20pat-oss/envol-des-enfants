import test from "node:test";
import assert from "node:assert/strict";
import { createNameCandidateSearch } from "../lib/quickbooks-name-candidates.ts";

const sample = (name, sku, rowNumber, type = "Stock") => ({
  name, sku, stock:"1",type,itemId:"",rowNumber,
});
const find = createNameCandidateSearch([
  sample("Barbie robe rose", "1234", 2),
  sample("Barbie robe jaune", "5678", 3),
  sample("Set bain INTEX", "7654", 4),
  sample("Bouée ronde", "1425", 5),
  sample("Barbie robe rose 50 cm", "7778", 6),
  sample("Lot de poupées Mini", "3552", 7, "Service"),
  sample("Barbie robe rose", "9999", 8),
  sample("assiette paw patrol 4+", "078300031420", 9),
  sample("assiettes paw patrol 3+", "078300031420", 10),
  sample("casquette paw patrol", "62058488526", 11),
  sample("Montre Paw Patrol enfant", "WATCH-0001", 12),
  sample("robe Barbie bleu", "DRESS-BLUE", 13),
  sample("Montre Paw Patrol", "WATCH-EXACT", 14),

]);

test("name matching is suggestions only", () => {
  const result = find("Set de bain INTEX");
  assert.equal(result[0]?.sku, "7654");
  assert.ok(result[0]?.score >= 65);
});
test("color mismatch does not suggest a different model", () => {
  const result = find("Barbie robe rouge");
  assert.ok(!result.some(item => item.sku === "1234" || item.sku === "5678"));
});
test("numerical model mismatch is never proposed", () => {
  const result = find("Barbie robe rose 24 cm");
  assert.ok(!result.some(item => item.sku === "7778"));
});
test("exact name collisions remain multiple candidate rows", () => {
  const result = find("Barbie robe rose");
  assert.equal(result.filter(item=>item.reason==="exact_name").length, 2);
});
test("name similarity flags non-inventory type warnings", () => {
  const result = find("Lot de poupées Mini");
  assert.ok(result[0]?.caution.includes("non Stock"));
});
test("generic one-token overlap is insufficient", () => {
  assert.deepEqual(find("Barbie aéroport"), []);
});
test("a name with no distinctive tokens yields no candidates", () => {
  assert.deepEqual(find("jouets pour les enfants"), []);
});
test("result list has at most 3 candidates by default", () => {
  assert.ok(find("Barbie robe rose").length <= 3);
});

test("a Paw Patrol watch must not match Paw Patrol plates", () => {
  const suggestions = find("Montre Paw Patrol", 5);
  assert.ok(!suggestions.some(x => x.name.toLowerCase().includes("assiette")));
});
test("a Paw Patrol watch must not match a Paw Patrol cap", () => {
  assert.ok(!find("Montre Paw Patrol", 5).some(
    x => x.name.toLowerCase().includes("casquette")
  ));
});
test("a Paw Patrol watch can still match another watch", () => {
  assert.ok(find("Montre Paw Patrol", 5).some(x => x.sku === "WATCH-EXACT"));
});
test("same franchise alone is never enough for a variant without product type", () => {
  const query = createNameCandidateSearch([
    sample("Paw Patrol 3+", "UNKNOWN-1", 2),
  ]);
  assert.deepEqual(query("Montre Paw Patrol"), []);
});
test("product type must match despite similar Barbie and color terms", () => {
  assert.ok(!find("Barbie robe rose", 5).some(x => x.sku === "UNKNOWN-1"));
});
