import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "lib", "default-catalog.ts");
let source = fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, "");

const match = source.match(/export const archiveSupplementProducts: Product\[\] = (\[[\s\S]*?\]);\n\nexport const defaultProducts/);
if (!match) throw new Error("Unable to locate archiveSupplementProducts");

const products = Function(`"use strict"; return (${match[1]});`)();
if (!Array.isArray(products) || products.length === 0) throw new Error("archiveSupplementProducts is empty or invalid");
const ids = products.map((product) => product.id).filter(Boolean);
if (new Set(ids).size !== ids.length) throw new Error("Duplicate archive supplement IDs found");

fs.mkdirSync(path.join(root, "data"), { recursive: true });
fs.writeFileSync(
  path.join(root, "data", "archive-supplement-products.json"),
  `${JSON.stringify(products, null, 2)}\n`,
);

source = source.replace(
  'import { mamaProducts } from "./mama-products";\n',
  'import { mamaProducts } from "./mama-products";\nimport archiveSupplementProductData from "../data/archive-supplement-products.json";\n',
);
source = source.replace(
  match[0],
  'export const archiveSupplementProducts: Product[] = archiveSupplementProductData as Product[];\n\nexport const defaultProducts',
);
fs.writeFileSync(sourcePath, source);

console.log(`Migrated ${products.length} archive supplement products to JSON`);
