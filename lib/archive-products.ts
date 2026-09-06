import { archiveSupplementProducts } from "./default-catalog";
import { mama4Products1 } from "./mama4-products-1";
import { mama4Products2 } from "./mama4-products-2";
import { mama4Products3 } from "./mama4-products-3";
import { mama4Products4 } from "./mama4-products-4";
import { mama4Products5 } from "./mama4-products-5";
import { mama4Products6 } from "./mama4-products-6";

const allArchiveProducts = [
  ...archiveSupplementProducts,
  ...mama4Products1,
  ...mama4Products2,
  ...mama4Products3,
  ...mama4Products4,
  ...mama4Products5,
  ...mama4Products6,
];

const productImageUrl = (product: (typeof allArchiveProducts)[number]) =>
  product.id.startsWith("mama4-") ? `/products/mama4/${product.id}.jpg` : (product.imageUrl || null);

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
    if (!product.id.startsWith("mama4-")) continue;
    statements.push(database.prepare(
      "UPDATE products SET image_url=?,updated_at=? WHERE id=?",
    ).bind(productImageUrl(product), now, product.id));
  }

  statements.push(database.prepare(
    "UPDATE products SET images_json=?,updated_at=? WHERE image_url=? AND (images_json IS NULL OR images_json='[]')",
  ).bind(
    JSON.stringify(["/products/archive-complements/camion-pompier-angle-2.webp"]),
    now,
    "/products/nouveautes/camion-pompier.webp",
  ));

  await database.batch(statements);
}
