import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));

const defaultProducts = readJson("data/default-products.json");
const archiveProducts = readJson("data/archive-supplement-products.json");
const mamaItems = readJson("data/mama-products.json");
const mama4Items = readJson("data/mama4-products.json");
const swimItems = readJson("data/swim-products.json");

const mamaProducts = mamaItems.map(([fr, en, category, brand], index) => ({
  id: `mama-${String(index + 1).padStart(2, "0")}`,
  name: { fr, en },
  category,
  brand,
  price: 0,
  priceConakry: 0,
  priceQc: 0,
  articleNumber: undefined,
  imageUrl: index === 15 ? "/products/poupees-mama/mama-16.jpg" : `/products/poupees-mama/mama-${String(index + 1).padStart(2, "0")}.webp`,
  source: "mama-products.json",
}));

const mama4Products = mama4Items.map((product) => ({
  ...product,
  imageUrl: `/products/mama4/${product.id}.jpg`,
  source: "mama4-products.json",
}));

const swimProducts = swimItems.map((product) => ({
  ...product,
  source: "swim-products.json",
}));

const products = [
  ...mamaProducts,
  ...archiveProducts.map((p) => ({ ...p, source: "archive-supplement-products.json" })),
  ...defaultProducts.map((p) => ({ ...p, source: "default-products.json" })),
  ...mama4Products,
  ...swimProducts,
];

const norm = (v) => String(v ?? "").trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
const groupDuplicates = (getter) => {
  const map = new Map();
  for (const p of products) {
    const key = getter(p);
    if (!key) continue;
    const arr = map.get(key) || [];
    arr.push(p);
    map.set(key, arr);
  }
  return [...map.entries()].filter(([, arr]) => arr.length > 1);
};

const duplicateIds = groupDuplicates((p) => norm(p.id));
const duplicateArticleNumbers = groupDuplicates((p) => norm(p.articleNumber));
const duplicateFrNames = groupDuplicates((p) => norm(p.name?.fr));
const duplicateImages = groupDuplicates((p) => norm(p.imageUrl));

const categories = new Map();
for (const p of products) {
  const c = String(p.category || "").trim();
  if (!categories.has(c)) categories.set(c, 0);
  categories.set(c, categories.get(c) + 1);
}

const suspiciousCategories = [...categories.entries()].filter(([c]) => !c || c !== c.toLowerCase() || /\s{2,}/.test(c));
const missingCore = products.filter((p) => !p.name?.fr || !p.name?.en || !p.category || !p.imageUrl);
const badImagePaths = products.filter((p) => p.imageUrl && (!p.imageUrl.startsWith("/") || !/\.(webp|png|jpe?g|avif|svg)$/i.test(p.imageUrl)));
const missingImageFiles = products.filter((p) => p.imageUrl && !fs.existsSync(path.join(root, "public", p.imageUrl.replace(/^\//, ""))));
const missingArticleNumbers = products.filter((p) => !String(p.articleNumber || "").trim());
const zeroOrNegativePrices = products.filter((p) => Number(p.price ?? p.priceConakry ?? 0) <= 0);
const filteredOutByRuntime = defaultProducts.filter((p) => !p.imageUrl);

const summary = {
  totalProducts: products.length,
  sources: {
    mama: mamaProducts.length,
    archiveSupplement: archiveProducts.length,
    defaultProducts: defaultProducts.length,
    mama4: mama4Products.length,
    swim: swimProducts.length,
  },
  duplicateIds: duplicateIds.length,
  duplicateArticleNumbers: duplicateArticleNumbers.length,
  duplicateFrenchNames: duplicateFrNames.length,
  duplicateImages: duplicateImages.length,
  suspiciousCategories: suspiciousCategories.length,
  missingCoreFields: missingCore.length,
  badImagePaths: badImagePaths.length,
  missingImageFiles: missingImageFiles.length,
  missingArticleNumbers: missingArticleNumbers.length,
  zeroOrNegativePrices: zeroOrNegativePrices.length,
  runtimeFilteredDefaultProducts: filteredOutByRuntime.length,
  categoryCounts: Object.fromEntries([...categories.entries()].sort((a,b) => a[0].localeCompare(b[0]))),
};

const printable = (groups, label) => {
  console.log(`\n## ${label} (${groups.length})`);
  for (const [key, arr] of groups.slice(0, 40)) {
    console.log(`- ${key}`);
    for (const p of arr) console.log(`  - ${p.id || "(no id)"} | ${p.name?.fr || "(no name)"} | ${p.source}`);
  }
};

const printProducts = (arr, label, max = 120, extra = () => "") => {
  console.log(`\n## ${label} (${arr.length})`);
  for (const p of arr.slice(0, max)) console.log(`- ${p.id || "(no id)"} | ${p.name?.fr || "(no name)"} | ${p.source}${extra(p)}`);
};

console.log("CATALOG_AUDIT_SUMMARY=" + JSON.stringify(summary));
printable(duplicateIds, "Duplicate IDs");
printable(duplicateArticleNumbers, "Duplicate article numbers");
printable(duplicateFrNames, "Duplicate French names");
printable(duplicateImages, "Duplicate image paths");

console.log(`\n## Suspicious categories (${suspiciousCategories.length})`);
for (const [c, count] of suspiciousCategories) console.log(`- ${JSON.stringify(c)}: ${count}`);

printProducts(missingCore, "Missing core fields");
printProducts(badImagePaths, "Bad image paths", 120, (p) => ` | image=${p.imageUrl}`);
printProducts(missingImageFiles, "Image paths whose file is absent from public/", 180, (p) => ` | image=${p.imageUrl}`);
printProducts(missingArticleNumbers, "Missing article numbers", 240);
printProducts(filteredOutByRuntime.map((p) => ({ ...p, source: "default-products.json" })), "Default products filtered out at runtime", 120);
printProducts(zeroOrNegativePrices, "Zero or negative raw prices", 240, (p) => ` | price=${p.price ?? "n/a"} | conakry=${p.priceConakry ?? "n/a"} | qc=${p.priceQc ?? "n/a"}`);
