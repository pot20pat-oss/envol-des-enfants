import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "data", "default-products.json");
const archivePath = path.join(root, "data", "legacy-default-products-without-images.json");

const products = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
if (!Array.isArray(products)) throw new Error("default-products.json is not an array");

const active = products.filter((product) => Boolean(product?.imageUrl));
const archived = products.filter((product) => !product?.imageUrl);

if (archived.length !== 32) {
  throw new Error(`Expected 32 runtime-filtered products, found ${archived.length}; refusing cleanup`);
}
if (active.length + archived.length !== products.length) throw new Error("Product split mismatch");

fs.writeFileSync(sourcePath, `${JSON.stringify(active, null, 2)}\n`);
fs.writeFileSync(archivePath, `${JSON.stringify(archived, null, 2)}\n`);
console.log(`Archived ${archived.length} products without images; ${active.length} active default products remain.`);
