import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
fs.mkdirSync(path.join(root, "data"), { recursive: true });

// Move the compact Mama tuple list to JSON while preserving its mapping logic.
const mamaPath = path.join(root, "lib", "mama-products.ts");
let mamaSource = fs.readFileSync(mamaPath, "utf8").replace(/^\uFEFF/, "");
const mamaMatch = mamaSource.match(/const items: MamaItem\[\] = (\[[\s\S]*?\]);\n\nexport const mamaProducts/);
if (!mamaMatch) throw new Error("Unable to locate Mama product tuple list");
const mamaItems = Function(`"use strict"; return (${mamaMatch[1]});`)();
if (!Array.isArray(mamaItems) || mamaItems.length === 0) throw new Error("Mama product tuple list is invalid");
fs.writeFileSync(path.join(root, "data", "mama-products.json"), `${JSON.stringify(mamaItems, null, 2)}\n`);
mamaSource = mamaSource.replace(
  'import { categorizedMamaProduct } from "./doll-category";\n',
  'import { categorizedMamaProduct } from "./doll-category";\nimport mamaProductData from "../data/mama-products.json";\n',
);
mamaSource = mamaSource.replace(
  mamaMatch[0],
  'const items: MamaItem[] = mamaProductData as MamaItem[];\n\nexport const mamaProducts',
);
fs.writeFileSync(mamaPath, mamaSource);

// Move the swimming catalog to JSON and keep a typed adapter.
const swimPath = path.join(root, "lib", "swim-products.ts");
const swimSource = fs.readFileSync(swimPath, "utf8").replace(/^\uFEFF/, "");
const swimMatch = swimSource.match(/export const swimProducts: Product\[\] = (\[[\s\S]*\]);\s*$/);
if (!swimMatch) throw new Error("Unable to locate swimProducts");
const swimProducts = Function(`"use strict"; return (${swimMatch[1]});`)();
if (!Array.isArray(swimProducts) || swimProducts.length !== 8) throw new Error(`Expected 8 swim products, found ${swimProducts.length}`);
fs.writeFileSync(path.join(root, "data", "swim-products.json"), `${JSON.stringify(swimProducts, null, 2)}\n`);
fs.writeFileSync(
  swimPath,
  'import type { Product } from "./default-catalog";\nimport swimProductData from "../data/swim-products.json";\n\nexport const swimProducts: Product[] = swimProductData as Product[];\n',
);

console.log(`Migrated ${mamaItems.length} Mama tuples and ${swimProducts.length} swim products to JSON`);
