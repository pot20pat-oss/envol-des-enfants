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
