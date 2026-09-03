import { archiveSupplementProducts } from "./default-catalog";

export async function ensureArchiveProducts(database: D1Database) {
  const now = new Date().toISOString();
  const statements = archiveSupplementProducts.map((product) => database.prepare(
    "INSERT OR IGNORE INTO products (id,article_number,name_fr,name_en,description_fr,description_en,category,price,stock,status,badge,ages,image_url,image_sheet,image_position,brand,visible,price_qc,price_conakry,stock_qc,stock_conakry,visible_qc,visible_conakry,images_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
  ).bind(
    product.id, product.articleNumber, product.name.fr, product.name.en,
    product.detail.fr, product.detail.en, product.category,
    product.priceConakry ?? product.price, product.stockConakry ?? 1,
    product.status, product.badge || null, product.ages, product.imageUrl || null,
    product.sheet || null, product.position, product.brand || null, 1,
    product.priceQc ?? 0, product.priceConakry ?? product.price,
    product.stockQc ?? 1, product.stockConakry ?? 1,
    product.visibleQc ? 1 : 0, product.visibleConakry === false ? 0 : 1,
    JSON.stringify(product.extraImages || []), now, now,
  ));

  statements.push(database.prepare(
    "UPDATE products SET images_json=?,updated_at=? WHERE image_url=? AND (images_json IS NULL OR images_json='[]')",
  ).bind(
    JSON.stringify(["/products/archive-complements/camion-pompier-angle-2.webp"]),
    now,
    "/products/nouveautes/camion-pompier.webp",
  ));

  await database.batch(statements);
}
