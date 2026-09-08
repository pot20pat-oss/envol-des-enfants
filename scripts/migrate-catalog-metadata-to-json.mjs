import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "lib", "default-catalog.ts");
let source = fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, "");

function findMatching(text, start, open, close) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (char === "\\") { escaped = true; continue; }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") { quote = char; continue; }
    if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error(`Unclosed ${open}${close} block`);
}

fs.mkdirSync(path.join(root, "data"), { recursive: true });

// removedProductNames currently mixes strings with product objects. Runtime code only
// consumes strings, so preserve the stray objects as legacy data while making the
// exported value explicitly string-only.
const removedMarker = "export const removedProductNames = ";
const removedMarkerIndex = source.indexOf(removedMarker);
if (removedMarkerIndex < 0) throw new Error("Unable to locate removedProductNames");
const removedStart = removedMarkerIndex + removedMarker.length;
if (source[removedStart] !== "[") throw new Error("removedProductNames is not an array literal");
const removedEnd = findMatching(source, removedStart, "[", "]");
const removedValues = Function(`"use strict"; return (${source.slice(removedStart, removedEnd + 1)});`)();
if (!Array.isArray(removedValues)) throw new Error("removedProductNames is invalid");
const removedNames = removedValues.filter((value) => typeof value === "string");
const legacyObjects = removedValues.filter((value) => value && typeof value === "object");
fs.writeFileSync(path.join(root, "data", "removed-product-names.json"), `${JSON.stringify(removedNames, null, 2)}\n`);
fs.writeFileSync(path.join(root, "data", "legacy-removed-product-objects.json"), `${JSON.stringify(legacyObjects, null, 2)}\n`);
source = `${source.slice(0, removedMarkerIndex)}export const removedProductNames: string[] = removedProductNameData as string[]${source.slice(removedEnd + 1)}`;

// Move the static reference-price lookup to JSON; keep matching rules in TS.
const priceMarker = "const referencePriceById: Record<string, number> = ";
const priceMarkerIndex = source.indexOf(priceMarker);
if (priceMarkerIndex < 0) throw new Error("Unable to locate referencePriceById");
const priceStart = priceMarkerIndex + priceMarker.length;
if (source[priceStart] !== "{") throw new Error("referencePriceById is not an object literal");
const priceEnd = findMatching(source, priceStart, "{", "}");
const priceMap = Function(`"use strict"; return (${source.slice(priceStart, priceEnd + 1)});`)();
if (!priceMap || typeof priceMap !== "object" || Array.isArray(priceMap)) throw new Error("referencePriceById is invalid");
fs.writeFileSync(path.join(root, "data", "reference-prices.json"), `${JSON.stringify(priceMap, null, 2)}\n`);
source = `${source.slice(0, priceMarkerIndex)}const referencePriceById = referencePriceData as Record<string, number>${source.slice(priceEnd + 1)}`;

const imports = [
  'import removedProductNameData from "../data/removed-product-names.json";',
  'import referencePriceData from "../data/reference-prices.json";',
];
for (const importLine of imports) {
  if (!source.includes(importLine)) {
    const anchor = 'import defaultInlineProductData from "../data/default-products.json";\n';
    source = source.replace(anchor, `${anchor}${importLine}\n`);
  }
}

fs.writeFileSync(sourcePath, source);
console.log(`Moved ${removedNames.length} removal names, ${legacyObjects.length} legacy objects, and ${Object.keys(priceMap).length} reference prices to JSON`);
