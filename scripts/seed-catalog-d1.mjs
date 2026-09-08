import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import * as v from "valibot";

const root = process.cwd();
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const translationSchema = v.object({ fr: v.string(), en: v.string() });
const productSchema = v.object({
  id: v.string(),
  name: translationSchema,
  category: v.string(),
  price: v.number(),
  ages: v.string(),
  sheet: v.string(),
  position: v.number(),
  imageUrl: v.string(),
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

const products = [];
const errors = [];
for (const [index, raw] of rawProducts.entries()) {
  const result = v.safeParse(productSchema, raw);
  if (!result.success) {
    errors.push(`Produit #${index + 1}: ${result.issues.map((issue) => issue.message).join("; ")}`);
    continue;
  }
  products.push(result.output);
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

const duplicateIds = duplicateValues(products.map((product) => product.id));
const duplicateNames = duplicateValues(products.map((product) => product.name.fr.trim().toLowerCase()));
const duplicateImages = duplicateValues(products.map((product) => product.imageUrl));

for (const id of duplicateIds) errors.push(`ID en double: ${id}`);
for (const name of duplicateNames) errors.push(`Nom FR en double: ${name}`);
for (const image of duplicateImages) errors.push(`Image en double: ${image}`);

const missingImages = products
  .filter((product) => product.imageUrl.startsWith("/") && !fs.existsSync(path.join(root, "public", product.imageUrl.replace(/^\//, ""))))
  .map((product) => `${product.id}: ${product.imageUrl}`);
for (const item of missingImages) errors.push(`Image manquante: ${item}`);

if (errors.length) {
  console.error(`Seed annulé: ${errors.length} erreur(s).`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const sqlString = (value) => value == null ? "NULL" : `'${String(value).replaceAll("'", "''")}'`;
const sqlNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? String(Math.trunc(Number(value))) : String(fallback);
const sqlBool = (value, fallback) => (value ?? fallback) ? "1" : "0";

const rows = products.map((product) => {
  const imageUrl = product.id.startsWith("mama4-") ? `/products/mama4/${product.id}.jpg` : product.imageUrl;
  const priceConakry = product.priceConakry ?? product.price;
  const priceQc = product.priceQc ?? 0;
  const stockConakry = product.stockConakry ?? product.stock ?? 1;
  const stockQc = product.stockQc ?? product.stock ?? 1;
  const values = [
    sqlString(product.id),
    sqlString(product.name.fr),
    sqlString(product.name.en),
    sqlString(product.detail.fr),
    sqlString(product.detail.en),
    sqlString(product.category),
    sqlNumber(priceConakry),
    sqlNumber(stockConakry, 1),
    sqlString(product.status),
    sqlString(product.badge ?? null),
    sqlString(product.ages),
    sqlString(imageUrl),
    sqlString(product.sheet || null),
    sqlNumber(product.position),
    sqlString(product.brand || null),
    "1",
    sqlNumber(priceQc),
    sqlNumber(priceConakry),
    sqlNumber(stockQc, 1),
    sqlNumber(stockConakry, 1),
    sqlBool(product.visibleQc, true),
    sqlBool(product.visibleConakry, true),
    sqlString(JSON.stringify(product.extraImages || [])),
  ];
  return `(${values.join(",")},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`;
});

const sql = `BEGIN TRANSACTION;\n\nINSERT INTO products (id,name_fr,name_en,description_fr,description_en,category,price,stock,status,badge,ages,image_url,image_sheet,image_position,brand,visible,price_qc,price_conakry,stock_qc,stock_conakry,visible_qc,visible_conakry,images_json,created_at,updated_at) VALUES\n${rows.join(",\n")}\nON CONFLICT(id) DO UPDATE SET\n  name_fr=excluded.name_fr,\n  name_en=excluded.name_en,\n  description_fr=excluded.description_fr,\n  description_en=excluded.description_en,\n  category=excluded.category,\n  price=excluded.price,\n  stock=excluded.stock,\n  status=excluded.status,\n  badge=excluded.badge,\n  ages=excluded.ages,\n  image_url=excluded.image_url,\n  image_sheet=excluded.image_sheet,\n  image_position=excluded.image_position,\n  brand=excluded.brand,\n  visible=excluded.visible,\n  price_qc=excluded.price_qc,\n  price_conakry=excluded.price_conakry,\n  stock_qc=excluded.stock_qc,\n  stock_conakry=excluded.stock_conakry,\n  visible_qc=excluded.visible_qc,\n  visible_conakry=excluded.visible_conakry,\n  images_json=excluded.images_json,\n  updated_at=CURRENT_TIMESTAMP;\n\nCOMMIT;\n`;

const outputDir = path.join(root, ".wrangler");
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, "catalog-seed.sql");
fs.writeFileSync(outputPath, sql, "utf8");

const zeroPriceCount = products.filter((product) => (product.priceConakry ?? product.price) <= 0).length;
console.log(`Catalogue valide: ${products.length} produits.`);
console.log(`Images manquantes: 0.`);
console.log(`Doublons ID/nom/image: 0.`);
console.log(`Prix Conakry à 0: ${zeroPriceCount}.`);
console.log(`SQL généré: ${path.relative(root, outputPath)}`);
console.log("Les numéros d’article existants ne sont jamais écrasés par ce seed.");

if (!process.argv.includes("--apply")) {
  console.log("Dry-run terminé. Utilise --apply pour exécuter le seed sur D1 distant.");
  process.exit(0);
}

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const command = spawnSync(npx, ["wrangler", "d1", "execute", "envol-des-enfants-db", "--remote", `--file=${outputPath}`], {
  cwd: root,
  stdio: "inherit",
});
if (command.error) throw command.error;
process.exit(command.status ?? 1);
