import assert from "node:assert/strict";
import test from "node:test";

import { marketPrice, marketSettings, normalizeMarket } from "../lib/markets.ts";

test("normalizes unknown regions to Conakry", () => {
  assert.equal(normalizeMarket("qc"), "qc");
  assert.equal(normalizeMarket("QC"), "conakry");
  assert.equal(normalizeMarket(undefined), "conakry");
});

test("formats prices for each market", () => {
  assert.match(marketPrice(25000, "conakry", "fr"), /25[\s\u00a0\u202f]?000 GNF/);
  assert.match(marketPrice(2599, "qc", "en"), /\$25\.99/);
  assert.equal(marketPrice(0, "qc", "fr"), "Prix à confirmer");
  assert.equal(marketPrice(0, "qc", "en"), "Price to be confirmed");
});

test("selects regional settings without leaking the other market", () => {
  const settings = {
    catalog_initialized: "true",
    phone: "global",
    conakry_phone: "224",
    qc_phone: "514",
  };

  assert.deepEqual(marketSettings(settings, "conakry"), {
    catalog_initialized: "true",
    phone: "224",
  });
  assert.deepEqual(marketSettings(settings, "qc"), {
    catalog_initialized: "true",
    phone: "514",
  });
});
