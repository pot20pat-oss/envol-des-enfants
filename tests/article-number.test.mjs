import assert from "node:assert/strict";
import test from "node:test";

import { articlePrefix, createArticleNumberGenerator } from "../lib/article-number.ts";

function databaseWith(products) {
  return {
    prepare(sql) {
      assert.match(sql, /SELECT category, article_number FROM products/);
      return { all: async () => ({ results: products }) };
    },
  };
}

test("maps known categories and falls back to ART", () => {
  assert.equal(articlePrefix("barbie"), "BAR");
  assert.equal(articlePrefix("princesses"), "DIS");
  assert.equal(articlePrefix("unknown"), "ART");
});

test("continues after current and legacy article-number formats", async () => {
  const generate = await createArticleNumberGenerator(databaseWith([
    { category: "barbie", article_number: "BAR0007" },
    { category: "barbie", article_number: "BAR-00012" },
    { category: "disney", article_number: "DIS-00003" },
    { category: "barbie", article_number: "DIS9999" },
    { category: "barbie", article_number: "invalid" },
  ]));

  assert.equal(generate("barbie"), "BAR0013");
  assert.equal(generate("barbie"), "BAR0014");
  assert.equal(generate("disney"), "DIS0004");
  assert.equal(generate("poupees"), "POU0001");
});
