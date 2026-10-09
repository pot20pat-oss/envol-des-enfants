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
test("the same brand and color cannot confuse a dress with a cap", () => {
  const query = createNameCandidateSearch([
    sample("casquette Barbie rose", "CAP-01", 2),
    sample("robe Barbie rose", "DRESS-01", 3),
  ]);
  const result = query("Barbie robe rose", 5);
  assert.ok(!result.some(x => x.sku === "CAP-01"));
  assert.ok(result.some(x => x.sku === "DRESS-01"));
});

test("repeated QuickBooks UGS is explicitly flagged for human review", () => {
  const matches = find("assiette paw patrol 4+", 5);
  assert.ok(matches.some(x =>
    x.sku === "078300031420" && x.caution.includes("UGS répétée")
  ));
});

test("Bluey interactive watch rejects Dora and PawPatrol watches", () => {
  const match = createNameCandidateSearch([
    sample("bluey montre", "QBO-BLUEY-1", 2),
    sample("montre interactive dora", "QBO-DORA-1", 3),
    sample("montre pawpatrol jeu interactive 3-6 ans", "QBO-PAW-1", 4),
  ]);
  const results = match("Montre-jeu interactive Bluey", 5);
  assert.equal(results.length, 1);
  assert.equal(results[0].sku, "QBO-BLUEY-1");
});
test("same brand alone cannot match a different franchise", () => {
  const match = createNameCandidateSearch([
    sample("montre Paw Patrol", "QBO-PAW", 2),
    sample("montre Dora", "QBO-DORA", 3),
    sample("montre interactive Bluey", "QBO-BLUEY", 4),
  ]);
  assert.deepEqual(match("montre interactive dora", 5).map(r=>r.sku), ["QBO-DORA"]);
});
test("missing licensed franchise on one side is not enough for a suggestion", () => {
  const match = createNameCandidateSearch([
    sample("montre interactive pour enfant", "NO-FRANCHISE", 2),
  ]);
  assert.deepEqual(match("montre interactive Bluey", 5), []);
});
test("known character with one shared umbrella brand is not enough", () => {
  const match = createNameCandidateSearch([
    sample("Disney Minnie montre", "QBO-MINNIE", 2),
    sample("Disney Mickey montre", "QBO-MICKEY", 3),
  ]);
  assert.deepEqual(match("Disney Minnie montre", 5).map(r=>r.sku), ["QBO-MINNIE"]);
});

test("generic coloring book name does not suggest other generic titles", () => {
  const compare = createNameCandidateSearch([
    sample("livre de coloriage", "COLORIAGE-2", 2),
    sample("livre de coloriage 3+", "9789464762525", 3),
    sample("colorista livre de coloriage 4+", "9789464762556", 4),
  ]);
  assert.deepEqual(compare("Livre de coloriage pour enfants", 5), []);
});
test("a similar normalized token set cannot be rated 100 if titles differ", () => {
  const compare = createNameCandidateSearch([
    sample("Bluey montre interactive", "3417765545054", 2),
  ]);
  const results = compare("Montre interactive Bluey", 5);
  assert.equal(results.length, 1);
  assert.ok(results[0].score < 100);
});
test("numbers present in only one title require manual lookup, not a proposed match", () => {
  const compare = createNameCandidateSearch([
    sample("Montre Bluey 3+", "WATCH-3", 2),
    sample("Montre Bluey", "WATCH-NO-AGE", 3),
  ]);
  const results = compare("Montre Bluey", 5);
  assert.ok(!results.some(item=>item.sku==="WATCH-3"));
  assert.ok(results.some(item=>item.sku==="WATCH-NO-AGE"));
});
test("identical generic name gets warning and never an identity score of 100", () => {
  const compare = createNameCandidateSearch([
    sample("Livre de coloriage pour enfants", "BOOK-GENERIC", 2),
  ]);
  const result = compare("Livre de coloriage pour enfants", 5);
  assert.equal(result.length,1);
  assert.ok(result[0].score < 100);
  assert.ok(result[0].caution.includes("Nom générique"));
});
test("distinctive exact name retains 100 but remains unverified", () => {
  const compare = createNameCandidateSearch([
    sample("Montre Bluey", "WATCH-BLUEY", 2),
  ]);
  const result = compare("Montre Bluey");
  assert.equal(result[0]?.score,100);
  assert.ok(result[0]?.caution.includes("Vérifier"));
});

test("maternelle coloring book does not suggest Colorista, 3-5 or Karma", () => {
  const compare = createNameCandidateSearch([
    sample("colorista livre de coloriage 4+", "9789464762556", 2),
    sample("gros livre de coloriage 3-5 ans", "coloriage 3", 3),
    sample("livre de coloriage karma", "063652589705", 4),
  ]);
  assert.deepEqual(compare("Livre de coloriage pour maternelle", 5), []);
});
test("different distinctive words cannot match through LIVRE and COLORIAGE alone", () => {
  const compare = createNameCandidateSearch([
    sample("livre de coloriage karma", "KARMA-1", 2),
  ]);
  assert.deepEqual(compare("livre de coloriage maternelle", 5), []);
});
test("identical generic touching-book title still needs review and score below 100", () => {
  const compare = createNameCandidateSearch([
    sample("Mon petit livre à toucher", "GENERIC-BOOK", 2),
  ]);
  const results = compare("Mon petit livre à toucher", 5);
  assert.equal(results.length, 1);
  assert.ok(results[0].score < 100);
  assert.ok(results[0].caution.includes("Nom générique"));
});
test("shared distinctive brand can still suggest a matching coloring book", () => {
  const compare = createNameCandidateSearch([
    sample("Crayola livre coloriage Pokémon", "POKEMON-BOOK", 2),
    sample("Karma livre coloriage", "KARMA-BOOK", 3),
  ]);
  const results = compare("Crayola livre de coloriage Pokémon", 5);
  assert.ok(results.some(x => x.sku === "POKEMON-BOOK"));
  assert.ok(!results.some(x => x.sku === "KARMA-BOOK"));
});
