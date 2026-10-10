import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { DatabaseSync } from "node:sqlite";

const inputSource = readFileSync(new URL("../app/api/admin/products/product-input.ts", import.meta.url), "utf8");
const routeSource = readFileSync(new URL("../app/api/admin/products/route.ts", import.meta.url), "utf8");
const publicSource = readFileSync(new URL("../app/api/catalog/route.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../drizzle/0022_product_purchase_costs.sql", import.meta.url), "utf8");
const helperSource = stripTypeScriptTypes(inputSource.replace(/^[\s\S]*?(?=type ProductInput =)/, ""))
  .replaceAll("export function ", "function ");
const bindings = new Function("numberValue", "stringValue", helperSource + "; return { createProductBindings, updateProductBindings }")(
  (v, d = 0) => v == null || v === "" ? d : Number(v),
  (v, d = "") => v == null ? d : String(v),
);
const insert = routeSource.match(/"INSERT INTO products \(([^"]+)\) VALUES \(([^"]+)\)"/);
const update = routeSource.match(/"UPDATE products SET ([^"]+)"/);
assert.ok(insert && update, "Cannot find product SQL");
const insertColumns = insert[1].split(",");
const insertSql = `INSERT INTO products (${insert[1]}) VALUES (${insert[2]})`;
const updateSql = "UPDATE products SET " + update[1];

function db() {
  const database = new DatabaseSync(":memory:");
  database.exec("CREATE TABLE products (" + insertColumns.filter(x => x !== "cost_qc" && x !== "cost_conakry").map(x => x === "id" ? "id TEXT PRIMARY KEY" : x + " TEXT").join(",") + ")");
  database.exec(migration);
  return database;
}
const product = { name_fr: "Produit-test", category: "eveil", price_qc: 2500, price_conakry: 80000, stock_qc: 4, stock_conakry: 6, cost_qc: 1099, cost_conakry: 42000 };
function create(database, data = product) {
  const args = bindings.createProductBindings(data, "test-1", "EVE-TEST", data.name_fr, data.category, "2026-10-10");
  assert.equal(args.length, (insertSql.match(/\?/g) || []).length, "INSERT binding count");
  database.prepare(insertSql).run(...args);
}
function change(database, data) {
  const args = bindings.updateProductBindings(data, "test-1", "2026-10-11");
  assert.equal(args.length, (updateSql.match(/\?/g) || []).length, "UPDATE binding count");
  database.prepare(updateSql).run(...args);
}

test("create stores both costs without changing selling prices and stock", () => {
  const database = db();
  try {
    create(database);
    const row = database.prepare("SELECT * FROM products WHERE id='test-1'").get();
    assert.equal(Number(row.cost_qc), 1099);
    assert.equal(Number(row.cost_conakry), 42000);
    assert.equal(Number(row.price_qc), 2500);
    assert.equal(Number(row.price_conakry), 80000);
    assert.equal(Number(row.stock_qc), 4);
    assert.equal(Number(row.stock_conakry), 6);
  } finally { database.close(); }
});

test("omitted costs stay unchanged; explicit blank clears to NULL", () => {
  const database = db();
  try {
    create(database);
    const { cost_qc, cost_conakry, ...withoutCosts } = product;
    change(database, withoutCosts);
    let row = database.prepare("SELECT cost_qc,cost_conakry FROM products WHERE id='test-1'").get();
    assert.equal(Number(row.cost_qc), 1099);
    assert.equal(Number(row.cost_conakry), 42000);
    change(database, { ...withoutCosts, cost_qc: "", cost_conakry: null });
    row = database.prepare("SELECT cost_qc,cost_conakry FROM products WHERE id='test-1'").get();
    assert.equal(row.cost_qc, null);
    assert.equal(row.cost_conakry, null);
  } finally { database.close(); }
});

test("existing rows are preserved when migration adds nullable costs", () => {
  const database = new DatabaseSync(":memory:");
  try {
    database.exec("CREATE TABLE products (id TEXT PRIMARY KEY, price_qc INTEGER, price_conakry INTEGER, stock_qc INTEGER)");
    database.prepare("INSERT INTO products VALUES ('test',2500,80000,4)").run();
    database.exec(migration);
    const row = database.prepare("SELECT * FROM products").get();
    assert.equal(row.price_qc, 2500);
    assert.equal(row.price_conakry, 80000);
    assert.equal(row.stock_qc, 4);
    assert.equal(row.cost_qc, null);
    assert.equal(row.cost_conakry, null);
  } finally { database.close(); }
});

test("public catalog SELECT does not include purchase cost columns", () => {
  const catalogQuery = publicSource.match(/SELECT id,article_number[^\u0060]+FROM products WHERE/);
  assert.ok(catalogQuery);
  assert.doesNotMatch(catalogQuery[0], /cost_qc|cost_conakry/);
});
