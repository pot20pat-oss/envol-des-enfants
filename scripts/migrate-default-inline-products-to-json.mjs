import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "lib", "default-catalog.ts");
let source = fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, "");

const marker = "export const defaultProducts: Product[] = ";
const markerIndex = source.indexOf(marker);
if (markerIndex < 0) throw new Error("Unable to locate defaultProducts declaration");

const arrayStart = source.indexOf("[", markerIndex + marker.length);
if (arrayStart < 0) throw new Error("Unable to locate defaultProducts array");

function findMatchingBracket(text, start) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error("Unclosed defaultProducts array");
}

const arrayEnd = findMatchingBracket(source, arrayStart);
const arrayExpression = source.slice(arrayStart, arrayEnd + 1);
const inlineExpression = arrayExpression
  .replace(/\.\.\.mamaProducts\s*,?/g, "")
  .replace(/\.\.\.archiveSupplementProducts\s*,?/g, "");

const products = Function(`"use strict"; return (${inlineExpression});`)();
if (!Array.isArray(products) || products.length === 0) {
  throw new Error("No inline default products were extracted");
}

fs.mkdirSync(path.join(root, "data"), { recursive: true });
fs.writeFileSync(
  path.join(root, "data", "default-products.json"),
  `${JSON.stringify(products, null, 2)}\n`,
);

if (!source.includes('import defaultInlineProductData from "../data/default-products.json";')) {
  source = source.replace(
    'import archiveSupplementProductData from "../data/archive-supplement-products.json";\n',
    'import archiveSupplementProductData from "../data/archive-supplement-products.json";\nimport defaultInlineProductData from "../data/default-products.json";\n',
  );
}

const replacement = "[\n  ...mamaProducts,\n  ...archiveSupplementProducts,\n  ...(defaultInlineProductData as Product[]),\n]";
source = `${source.slice(0, arrayStart)}${replacement}${source.slice(arrayEnd + 1)}`;
fs.writeFileSync(sourcePath, source);

console.log(`Migrated ${products.length} inline default products to data/default-products.json`);
