import { archiveSupplementProducts } from "./default-catalog";
import { mama4Products1 } from "./mama4-products-1";
import { mama4Products2 } from "./mama4-products-2";
import { mama4Products3 } from "./mama4-products-3";
import { mama4Products4 } from "./mama4-products-4";
import { mama4Products5 } from "./mama4-products-5";
import { mama4Products6 } from "./mama4-products-6";
import { swimProducts } from "./swim-products";
import { articlePrefix } from "./article-number";

const allArchiveProducts = [
  ...archiveSupplementProducts,
  ...mama4Products1,
  ...mama4Products2,
  ...mama4Products3,
  ...mama4Products4,
  ...mama4Products5,
  ...mama4Products6,
  ...swimProducts,
];

const productImageUrl = (product: (typeof allArchiveProducts)[number]) =>
  product.id.startsWith("mama4-") ? `/products/mama4/${product.id}.jpg` : (product.imageUrl || null);

type ArticleNumberRow = {
  id: string;
  category: string;
  article_number: string | null;
};

type ArticleNumberCandidate = {
  id: string;
  category: string;
};

type ArticleNumberAssignment = ArticleNumberCandidate & {
  articleNumber: string;
};

export function collectCategoryArticleNumberState(rows: ArticleNumberRow[]) {
  const maxByPrefix = new Map<string, number>();
  const needsNumber: ArticleNumberCandidate[] = [];

  for (const product of rows) {
    const prefix = articlePrefix(product.category);
    const current = String(product.article_number || "").trim().toUpperCase();
    const match = current.match(/^([A-Z0-9]{3})-(\d{4,6})$/);

    if (match && match[1] === prefix) {
      maxByPrefix.set(prefix, Math.max(maxByPrefix.get(prefix) || 0, Number(match[2])));
      continue;
    }

    needsNumber.push({ id: product.id, category: product.category });
  }

  return { maxByPrefix, needsNumber };
}

export function assignCategoryArticleNumbers(
  needsNumber: ArticleNumberCandidate[],
  currentMaxByPrefix: Map<string, number>,
): ArticleNumberAssignment[] {
  const maxByPrefix = new Map(currentMaxByPrefix);

  return needsNumber.map((product) => {
    const prefix = articlePrefix(product.category);
    const next = (maxByPrefix.get(prefix) || 0) + 1;
    maxByPrefix.set(prefix, next);

    return {
      ...product,
      articleNumber: `${prefix}-${String(next).padStart(4, "0")}`,
    };
  });
}

export async function ensureCategoryArticleNumbers(database: D1Database, now: string) {
  const { results } = await database.prepare(
    "SELECT id,category,article_number FROM products ORDER BY created_at,id",
  ).all<ArticleNumberRow>();

  const { maxByPrefix, needsNumber } = collectCategoryArticleNumberState(results || []);
  if (!needsNumber.length) return;

  const assignments = assignCategoryArticleNumbers(needsNumber, maxByPrefix);

  // Retire temporairement les anciens numéros pour éviter toute collision UNIQUE.
  const clearStatements = needsNumber.map((product) => database.prepare(
    "UPDATE products SET article_number=NULL WHERE id=?",
  ).bind(product.id));
  await database.batch(clearStatements);

  const updateStatements = assignments.map((product) => database.prepare(
    "UPDATE products SET article_number=?,updated_at=? WHERE id=?",
  ).bind(product.articleNumber, now, product.id));

  await database.batch(updateStatements);
}

export async function ensureArchiveProducts(database: D1Database) {
  const now = new Date().toISOString();
  const statements = allArchiveProducts.map((product) => database.prepare(
    "INSERT OR IGNORE INTO products (id,article_number,name_fr,name_en,description_fr,description_en,category,price,stock,status,badge,ages,image_url,image_sheet,image_position,brand,visible,price_qc,price_conakry,stock_qc,stock_conakry,visible_qc,visible_conakry,images_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
  ).bind(
    product.id, product.articleNumber ?? null, product.name.fr, product.name.en,
    product.detail.fr, product.detail.en, product.category,
    product.priceConakry ?? product.price, product.stockConakry ?? 1,
    product.status, product.badge || null, product.ages, productImageUrl(product),
    product.sheet || null, product.position, product.brand || null, 1,
    product.priceQc ?? 0, product.priceConakry ?? product.price,
    product.stockQc ?? 1, product.stockConakry ?? 1,
    product.visibleQc ? 1 : 0, product.visibleConakry === false ? 0 : 1,
    JSON.stringify(product.extraImages || []), now, now,
  ));

  for (const product of allArchiveProducts) {
    if (product.id.startsWith("mama4-")) {
      statements.push(database.prepare(
        "UPDATE products SET image_url=?,updated_at=? WHERE id=?",
      ).bind(productImageUrl(product), now, product.id));
      continue;
    }

    if (product.id.startsWith("piscine-")) {
      statements.push(database.prepare(
        "UPDATE products SET article_number=?,category=?,brand=?,image_url=?,name_fr=?,name_en=?,description_fr=?,description_en=?,visible=1,visible_qc=?,visible_conakry=?,updated_at=? WHERE id=?",
      ).bind(
        product.articleNumber ?? null,
        product.category,
        product.brand || null,
        productImageUrl(product),
        product.name.fr,
        product.name.en,
        product.detail.fr,
        product.detail.en,
        product.visibleQc ? 1 : 0,
        product.visibleConakry === false ? 0 : 1,
        now,
        product.id,
      ));
    }
  }

  statements.push(database.prepare(
    "UPDATE products SET images_json=?,updated_at=? WHERE image_url=? AND (images_json IS NULL OR images_json='[]')",
  ).bind(
    JSON.stringify(["/products/archive-complements/camion-pompier-angle-2.webp"]),
    now,
    "/products/nouveautes/camion-pompier.webp",
  ));

  await database.batch(statements);
  await ensureCategoryArticleNumbers(database, now);
}
