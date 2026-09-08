import assert from "node:assert/strict";
import test from "node:test";

import {
  assignCategoryArticleNumbers,
  collectCategoryArticleNumberState,
  ensureCategoryArticleNumbers,
} from "../lib/archive-product-numbering.ts";

test("collectCategoryArticleNumberState keeps valid maxima and flags invalid numbers", () => {
  const { maxByPrefix, needsNumber } = collectCategoryArticleNumberState([
    { id: "1", category: "barbie", article_number: "BAR-0007" },
    { id: "2", category: "barbie", article_number: "BAR-0012" },
    { id: "3", category: "barbie", article_number: "DIS-9999" },
    { id: "4", category: "disney", article_number: null },
  ]);

  assert.equal(maxByPrefix.get("BAR"), 12);
  assert.deepEqual(needsNumber, [
    { id: "3", category: "barbie" },
    { id: "4", category: "disney" },
  ]);
});

test("assignCategoryArticleNumbers continues sequences independently per category prefix", () => {
  const assignments = assignCategoryArticleNumbers(
    [
      { id: "1", category: "barbie" },
      { id: "2", category: "barbie" },
      { id: "3", category: "disney" },
    ],
    new Map([
      ["BAR", 9],
      ["DIS", 3],
    ]),
  );

  assert.deepEqual(assignments, [
    { id: "1", category: "barbie", articleNumber: "BAR-0010" },
    { id: "2", category: "barbie", articleNumber: "BAR-0011" },
    { id: "3", category: "disney", articleNumber: "DIS-0004" },
  ]);
});

function databaseWith(rows) {
  const batches = [];

  return {
    batches,
    prepare(sql) {
      if (sql.startsWith("SELECT")) {
        return {
          all: async () => ({ results: rows }),
        };
      }

      return {
        bind(...params) {
          return { sql, params };
        },
      };
    },
    async batch(statements) {
      batches.push(statements);
      return [];
    },
  };
}

test("ensureCategoryArticleNumbers clears invalid values before assigning collision-safe replacements", async () => {
  const database = databaseWith([
    { id: "barbie-existing", category: "barbie", article_number: "BAR-0004" },
    { id: "barbie-invalid", category: "barbie", article_number: "BAD-0009" },
    { id: "disney-empty", category: "disney", article_number: null },
  ]);
  const now = "2026-09-08T12:00:00.000Z";

  await ensureCategoryArticleNumbers(database, now);

  assert.equal(database.batches.length, 2);
  assert.deepEqual(database.batches[0], [
    {
      sql: "UPDATE products SET article_number=NULL WHERE id=?",
      params: ["barbie-invalid"],
    },
    {
      sql: "UPDATE products SET article_number=NULL WHERE id=?",
      params: ["disney-empty"],
    },
  ]);
  assert.deepEqual(database.batches[1], [
    {
      sql: "UPDATE products SET article_number=?,updated_at=? WHERE id=?",
      params: ["BAR-0005", now, "barbie-invalid"],
    },
    {
      sql: "UPDATE products SET article_number=?,updated_at=? WHERE id=?",
      params: ["DIS-0001", now, "disney-empty"],
    },
  ]);
});

test("ensureCategoryArticleNumbers does not write when every article number is already valid", async () => {
  const database = databaseWith([
    { id: "1", category: "barbie", article_number: "BAR-0001" },
    { id: "2", category: "disney", article_number: "DIS-0002" },
  ]);

  await ensureCategoryArticleNumbers(database, "2026-09-08T12:00:00.000Z");

  assert.equal(database.batches.length, 0);
});
