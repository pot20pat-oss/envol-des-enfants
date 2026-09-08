import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import * as v from "valibot";

const root = process.cwd();
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const translationSchema = v.object({ fr: v.string(), en: v.string() });
const productSchema = v.object({
  id: v.optional(v.string()),
  name: translationSchema,
  category: v.string(),
  price: v.number(),
  ages: v.string(),
  sheet: v.string(),
  position: v.number(),
  imageUrl: v.optional(v.string()),
  extraImages: v.optional(v.array(v.string())),
  stock: v.optional(v.number()),
  status: v.picklist(["available", "reserved", "sold"]),
  badge: v.optional(v.picklist(["new", "school"])),
  detail: translationSchema,
  priceConakry: v.optional(v.number()),
  priceQc: v.optional(v.number()),
  stockConakry: v.optional(v.number()),
  stockQc: v.optional(v.number()),
  visibleConakry: v.optional(v.boolean()),
  visibleQc: v.optional(v.boolean()),
  brand: v.optional(v.string()),
});

const categoryForMama = (category, brand) => {
  if (category === "disney" || category === "barbie") return category;
  if (brand === "My Life As") return "mylife";
  if (brand === "Miraculous") return "miraculous";
  if (brand === "LOL Surprise" || brand === "LOL OMG") return "lol";
  if (brand === "Rainbow High" || brand === "Shadow High") return "rainbowhigh";
  if (brand === "Baby Alive") return "babyalive";
  if (brand === "Hairmazing") return "hairmazing";
  if (brand === "Karma's World") return "karma";
  if (brand === "My Sweet Baby") return "mysweetbaby";
  if (brand === "Glamour Girl") return "glamourgirl";
  return "autres_poupees";
};

const mamaProducts = readJson("data/mama-products.json").map(([fr, en, category, brand], index) => ({
  id: `mama-${String(index + 1).padStart(2, "0")}`,
  name: { fr, en },
  category: categoryForMama(category, brand),
  brand,
  price: 0,
  priceConakry: 0,
  priceQc: 0,
  stockConakry: 1,
  stockQc: 1,
  visibleConakry: true,
  visibleQc: true,
  ages: "3+",
  sheet: "",
  position: 0,
  imageUrl: index === 15 ? "/products/poupees-mama/mama-16.jpg" : `/products/poupees-mama/mama-${String(index + 1).padStart(2, "0")}.webp`,
  status: "available",
  badge: "new",
  detail: {
    fr: category === "disney" ? "Poupée ou accessoire de princesse Disney." : "Poupée ou accessoire pour enrichir les histoires et le jeu imaginatif.",
    en: category === "disney" ? "Disney princess doll or accessory." : "Doll or accessory for imaginative storytelling and play.",
  },
}));

const rawProducts = [
  ...readJson("data/default-products.json"),
  ...readJson("data/archive-supplement-products.json"),
  ...mamaProducts,
  ...readJson("data/mama4-products.json"),
  ...readJson("data/swim-products.json"),
];

const stableId = (name) => `seed-${createHash("sha1").update(name.trim().toLocaleLowerCase("fr")).digest("hex").slice(0, 12)}`;
const products = [];
const errors = [];

for (const [index, raw] of rawProducts.entries()) {
  const result = v.safeParse(productSchema, raw);
  if (!result.success) {
    errors.push(`Produit #${index + 1}: ${result.issues.map((issue) => issue.message).join("; ")}`);
    continue;
  }

  const product = result.output;
  const id = product.id?.trim() || stableId(product.name.fr);
  const imageUrl = id.startsWith("mama4-") ? `/products/mama4/${id}.jpg` : product.imageUrl;
  if (!imageUrl) {
    errors.push(`Produit ${id}: imageUrl absent.`);
    continue;
  }

  products.push({ ...product, id, imageUrl });
}

const duplicateValues = (values) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
};

for (const id of duplicateValues(products.map((product) => product.id))) errors.push(`ID en double: ${id}`);
for (const name of duplicateValues(products.map((product) => product.name.fr.trim().toLocaleLowerCase("fr")))) errors.push(`Nom FR en double: ${name}`);
for (const image of duplicateValues(products.map((product) => product.imageUrl))) errors.push(`Image en double: ${image}`);

for (const product of products) {
  if (product.imageUrl.startsWith("/") && !fs.existsSync(path.join(root, "public", product.imageUrl.replace(/^\//, "")))) {
    errors.push(`Image manquante: ${product.id}: ${product.imageUrl}`);
  }
}

if (errors.length) {
  console.error(`Seed annulé: ${errors.length} erreur(s).`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const sqlString = (value) => value == null ? "NULL" : `'${String(value).replaceAll("'", "''")}'`;
const sqlNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? String(Math.trunc(Number(value))) : String(fallback);
const sqlBool = (value, fallback) => (value ?? fallback) ? "1" : "0";
const preservePositive = (column, incoming) => `CASE WHEN ${incoming}>0 THEN ${incoming} ELSE ${column} END`;

const sqlForProduct = (product) => {
  const priceConakry = product.priceConakry ?? product.price;
  const priceQc = product.priceQc ?? 0;
  const stockConakry = product.stockConakry ?? product.stock ?? (product.status === "sold" ? 0 : 1);
  const stockQc = product.stockQc ?? product.stock ?? (product.status === "sold" ? 0 : 1);
  const nameKey = product.name.fr.trim();
  const where = `(id=${sqlString(product.id)} OR lower(trim(name_fr))=lower(trim(${sqlString(nameKey)})))`;
  const priceConakrySql = sqlNumber(priceConakry);
  const priceQcSql = sqlNumber(priceQc);
  const stockConakrySql = sqlNumber(stockConakry, 1);
  const stockQcSql = sqlNumber(stockQc, 1);

  const assignments = [
    `name_fr=${sqlString(product.name.fr)}`,
    `name_en=${sqlString(product.name.en)}`,
    `description_fr=${sqlString(product.detail.fr)}`,
    `description_en=${sqlString(product.detail.en)}`,
    `category=${sqlString(product.category)}`,
    `price=${preservePositive("price", priceConakrySql)}`,
    `stock=${preservePositive("stock", stockConakrySql)}`,
    `status=${sqlString(product.status)}`,
    `badge=${sqlString(product.badge ?? null)}`,
    `ages=${sqlString(product.ages)}`,
    `image_url=${sqlString(product.imageUrl)}`,
    `image_sheet=${sqlString(product.sheet || null)}`,
    `image_position=${sqlNumber(product.position)}`,
    `brand=${sqlString(product.brand || null)}`,
    "visible=1",
    `price_qc=${preservePositive("price_qc", priceQcSql)}`,
    `price_conakry=${preservePositive("price_conakry", priceConakrySql)}`,
    `stock_qc=${preservePositive("stock_qc", stockQcSql)}`,
    `stock_conakry=${preservePositive("stock_conakry", stockConakrySql)}`,
    `visible_qc=${sqlBool(product.visibleQc, true)}`,
    `visible_conakry=${sqlBool(product.visibleConakry, true)}`,
    `images_json=${sqlString(JSON.stringify(product.extraImages || []))}`,
    "updated_at=CURRENT_TIMESTAMP",
  ];

  const values = [
    sqlString(product.id), "NULL", sqlString(product.name.fr), sqlString(product.name.en),
    sqlString(product.detail.fr), sqlString(product.detail.en), sqlString(product.category),
    priceConakrySql, stockConakrySql, sqlString(product.status),
    sqlString(product.badge ?? null), sqlString(product.ages), sqlString(product.imageUrl),
    sqlString(product.sheet || null), sqlNumber(product.position), sqlString(product.brand || null),
    "1", priceQcSql, priceConakrySql, stockQcSql, stockConakrySql,
    sqlBool(product.visibleQc, true), sqlBool(product.visibleConakry, true),
    sqlString(JSON.stringify(product.extraImages || [])), "CURRENT_TIMESTAMP", "CURRENT_TIMESTAMP",
  ];

  return `UPDATE products SET ${assignments.join(",")} WHERE ${where};\nINSERT INTO products (id,article_number,name_fr,name_en,description_fr,description_en,category,price,stock,status,badge,ages,image_url,image_sheet,image_position,brand,visible,price_qc,price_conakry,stock_qc,stock_conakry,visible_qc,visible_conakry,images_json,created_at,updated_at) SELECT ${values.join(",")} WHERE NOT EXISTS (SELECT 1 FROM products WHERE ${where});`;
};

const sql = `${products.map(sqlForProduct).join("\n\n")}\n\nINSERT INTO settings (key,value,updated_at) VALUES ('catalog_initialized','true',CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at;\n`;

const outputDir = path.join(root, ".wrangler");
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, "catalog-seed.sql");
fs.writeFileSync(outputPath, sql, "utf8");

const zeroPriceCount = products.filter((product) => (product.priceConakry ?? product.price) <= 0).length;
const generatedIdCount = products.filter((product) => product.id.startsWith("seed-")).length;
console.log(`Catalogue valide: ${products.length} produits.`);
console.log(`IDs stables générés pour produits historiques: ${generatedIdCount}.`);
console.log("Images manquantes: 0.");
console.log("Doublons ID/nom/image: 0.");
console.log(`Prix Conakry à 0 dans les JSON: ${zeroPriceCount}.`);
console.log("Protection production: prix/stock existants > 0 conservés quand le JSON fournit 0.");
console.log(`SQL généré: ${path.relative(root, outputPath)}`);
console.log("Le seed réutilise les produits existants par ID ou nom FR et ne modifie jamais article_number.");

if (!process.argv.includes("--apply")) {
  console.log("Dry-run terminé. Utilise --apply pour exécuter le seed sur D1 distant.");
  process.exit(0);
}

const command = spawnSync("npx", ["wrangler", "d1", "execute", "envol-des-enfants-db", "--remote", `--file=${outputPath}`], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (command.error) throw command.error;
process.exit(command.status ?? 1);
