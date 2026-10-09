import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const source = readFileSync(new URL("../app/api/quickbooks/missing-prices-report/route.ts", import.meta.url), "utf8")
  .replace(/^import .*\n/, "");
const compiled = stripTypeScriptTypes(source).replace("export async function GET", "async function GET");

function run(rows, admin = true) {
  let reads = 0;
  const GET = new Function("deps", "Response", `
    const { currentAdmin, forbidden, cmsEnv } = deps;
    ${compiled}
    return GET;
  `)({
    currentAdmin: async () => admin ? { id: "fake-admin" } : null,
    forbidden: () => new Response("Forbidden", { status: 401 }),
    cmsEnv: () => ({ DB: {
      prepare(sql) {
        assert.match(sql, /^SELECT /);
        reads++;
        return { all: async () => ({ results: rows }) };
      },
    } }),
  }, Response);
  return { GET, reads: () => reads };
}

test("export requires administrator before any database read", async () => {
  const h = run([], false);
  assert.equal((await h.GET(new Request("https://example.test/"))).status, 401);
  assert.equal(h.reads(), 0);
});

test("CSV separates markets and reports only visible invalid stored prices", async () => {
  const h = run([
    { article_number: "X01", name_fr: "Jouet", price_qc: 0, price_conakry: 900, visible_qc: 1, visible_conakry: 1 },
    { article_number: "X02", name_fr: "Poupée", price_qc: 50, price_conakry: null, visible_qc: 1, visible_conakry: 1 },
    { article_number: "X03", name_fr: "Invisible", price_qc: 0, price_conakry: 0, visible_qc: 0, visible_conakry: 0 },
  ]);
  const response = await h.GET(new Request("https://example.test/"));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Content-Type"), /text\/csv/);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  const csv = await response.text();
  assert.match(csv, /Québec/);
  assert.match(csv, /Conakry/);
  assert.match(csv, /X01/);
  assert.match(csv, /X02/);
  assert.doesNotMatch(csv, /X03/);
  assert.equal(csv.trim().split("\r\n").length, 3);
});

test("CSV quotes dangerous spreadsheet formula values", async () => {
  const h = run([{ article_number: "=2+2", name_fr: "@SUM(1)", price_qc: 0, price_conakry: 5, visible_qc: 1, visible_conakry: 0 }]);
  const csv = await (await h.GET(new Request("https://example.test/"))).text();
  assert.match(csv, /"'=2\+2"/);
  assert.match(csv, /"'@SUM\(1\)"/);
});
