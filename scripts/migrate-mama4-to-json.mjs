import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePaths = Array.from({ length: 6 }, (_, index) => path.join(root, "lib", `mama4-products-${index + 1}.ts`));
const products = [];

for (const sourcePath of sourcePaths) {
  const source = fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, "");
  const match = source.match(/=\s*(\[.*\]);\s*$/s);
  if (!match) throw new Error(`Unable to extract product array from ${sourcePath}`);
  const batch = JSON.parse(match[1]);
  if (!Array.isArray(batch)) throw new Error(`${sourcePath} does not contain an array`);
  products.push(...batch);
}

if (products.length !== 51) throw new Error(`Expected 51 Mama4 products, found ${products.length}`);
const ids = products.map((product) => product.id);
if (new Set(ids).size !== ids.length) throw new Error("Duplicate Mama4 product IDs found");

fs.mkdirSync(path.join(root, "data"), { recursive: true });
fs.writeFileSync(path.join(root, "data", "mama4-products.json"), `${JSON.stringify(products, null, 2)}\n`);

fs.writeFileSync(
  path.join(root, "lib", "mama4-products.ts"),
  `import type { Product } from "./default-catalog";\nimport mama4ProductData from "../data/mama4-products.json";\n\nexport const mama4Products: Product[] = mama4ProductData as Product[];\n`,
);

const archivePath = path.join(root, "lib", "archive-products.ts");
let archive = fs.readFileSync(archivePath, "utf8");
archive = archive.replace(
  /import \{ mama4Products1 \} from "\.\/mama4-products-1";\nimport \{ mama4Products2 \} from "\.\/mama4-products-2";\nimport \{ mama4Products3 \} from "\.\/mama4-products-3";\nimport \{ mama4Products4 \} from "\.\/mama4-products-4";\nimport \{ mama4Products5 \} from "\.\/mama4-products-5";\nimport \{ mama4Products6 \} from "\.\/mama4-products-6";/,
  'import { mama4Products } from "./mama4-products";',
);
archive = archive.replace(
  /  \.\.\.mama4Products1,\n  \.\.\.mama4Products2,\n  \.\.\.mama4Products3,\n  \.\.\.mama4Products4,\n  \.\.\.mama4Products5,\n  \.\.\.mama4Products6,/,
  "  ...mama4Products,",
);
fs.writeFileSync(archivePath, archive);

for (const sourcePath of sourcePaths) fs.rmSync(sourcePath);

console.log(`Migrated ${products.length} Mama4 products to data/mama4-products.json`);
