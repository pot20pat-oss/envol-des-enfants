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

test("maps known categories and falls back to a three-character code", () => {
  assert.equal(articlePrefix("barbie"), "BAR");
  assert.equal(articlePrefix("disney"), "DIS");
  assert.equal(articlePrefix("princesses"), "DIS");
  assert.equal(articlePrefix("mylife"), "MYL");
  assert.equal(articlePrefix("unknown"), "UNK");
  assert.equal(articlePrefix(""), "ART");
});

test("continues after current and legacy article-number formats", async () => {
  const generate = await createArticleNumberGenerator(databaseWith([
    { category: "barbie", article_number: "BAR0007" },
    { category: "barbie", article_number: "BAR-0012" },
    { category: "disney", article_number: "DIS-0003" },
    { category: "barbie", article_number: "DIS9999" },
    { category: "barbie", article_number: "invalid" },
  ]));

  assert.equal(generate("barbie"), "BAR-0013");
  assert.equal(generate("barbie"), "BAR-0014");
  assert.equal(generate("disney"), "DIS-0004");
  assert.equal(generate("poupees"), "POU-0001");
});
