import { archiveSupplementProducts } from "./default-catalog";
import { mama4Products } from "./mama4-products";
import { swimProducts } from "./swim-products";
import { ensureCategoryArticleNumbers } from "./archive-product-numbering";

const allArchiveProducts = [
  ...archiveSupplementProducts,
  ...mama4Products,
  ...swimProducts,
];

const productImageUrl = (product: (typeof allArchiveProducts)[number]) =>
  product.id.startsWith("mama4-") ? `/products/mama4/${product.id}.jpg` : (product.imageUrl || null);

export { ensureCategoryArticleNumbers } from "./archive-product-numbering";

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
