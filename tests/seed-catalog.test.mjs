import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

test("catalog seed preserves live inventory fields on existing products", () => {
  const run = spawnSync(process.execPath, ["scripts/seed-catalog-d1.mjs"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(run.status, 0, run.stderr || run.stdout);

  const sql = fs.readFileSync(path.join(root, ".wrangler", "catalog-seed.sql"), "utf8");
  const updates = [...sql.matchAll(/UPDATE products SET ([^;]+) WHERE /g)].map((match) => match[1]);

  assert.ok(updates.length > 0, "Le seed doit générer des UPDATE pour les produits existants.");

  for (const assignments of updates) {
    assert.doesNotMatch(assignments, /(?:^|,)stock=/);
    assert.doesNotMatch(assignments, /(?:^|,)stock_qc=/);
    assert.doesNotMatch(assignments, /(?:^|,)stock_conakry=/);
    assert.doesNotMatch(assignments, /(?:^|,)status=/);
    assert.doesNotMatch(assignments, /(?:^|,)article_number=/);
  }

  assert.match(sql, /INSERT INTO products \([^)]*stock[^)]*status[^)]*stock_qc[^)]*stock_conakry/);
});
