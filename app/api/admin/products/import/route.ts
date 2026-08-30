import { body, cmsEnv, currentAdmin, forbidden, numberValue, stringValue } from "@/lib/cms";
import { defaultProducts, removedProductNames } from "@/lib/default-catalog";
import { generateArticleNumber } from "@/lib/article-number";

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const data = await body(request);
  const requestedProducts = Array.isArray(data.products) ? data.products : [];
  const products = [...requestedProducts, ...defaultProducts].filter((candidate, index, all) => {
    if (!candidate || typeof candidate !== "object") return false;
    const product = candidate as Record<string, unknown>;
    const name = product.name && typeof product.name === "object" ? product.name as Record<string, unknown> : {};
    const frenchName = stringValue(name.fr).trim().toLocaleLowerCase("fr");
    return Boolean(frenchName) && all.findIndex((entry) => {
      if (!entry || typeof entry !== "object") return false;
      const entryProduct = entry as Record<string, unknown>;
      const entryName = entryProduct.name && typeof entryProduct.name === "object" ? entryProduct.name as Record<string, unknown> : {};
      return stringValue(entryName.fr).trim().toLocaleLowerCase("fr") === frenchName;
    }) === index;
  });

  const database = cmsEnv().DB;
  const existing = await database.prepare("SELECT id,name_fr,article_number FROM products").all<{ id: string; name_fr: string; article_number?: string }>();
  const productsByName = new Map(existing.results.map((product) => [product.name_fr.trim().toLocaleLowerCase("fr"), product]));
  const statements = [];
  let imported = 0;
  let updated = 0;
  let removed = 0;
  const now = new Date().toISOString();

  const productsToRemove = [...(Array.isArray(data.removedProductNames) ? data.removedProductNames : []), ...removedProductNames];
  if (productsToRemove.length) {
    for (const candidate of [...new Set(productsToRemove.map((name) => stringValue(name).trim()))].slice(0, 100)) {
      const name = stringValue(candidate).trim();
      if (!name) continue;
      statements.push(database.prepare("DELETE FROM products WHERE name_fr=?").bind(name));
      if (productsByName.has(name.toLocaleLowerCase("fr"))) removed += 1;
    }
  }

  for (const candidate of products.slice(0, 250)) {
    if (!candidate || typeof candidate !== "object") continue;
    const product = candidate as Record<string, unknown>;
    const name = product.name && typeof product.name === "object" ? product.name as Record<string, unknown> : {};
    const detail = product.detail && typeof product.detail === "object" ? product.detail as Record<string, unknown> : {};
    const frenchName = stringValue(name.fr).trim();
    if (!frenchName) continue;
    const normalizedName = frenchName.toLocaleLowerCase("fr");

    const status = stringValue(product.status, "available");
    const defaultStock = status === "sold" ? 0 : 1;
    const priceConakry = numberValue(product.priceConakry ?? product.price);
    const priceQc = numberValue(product.priceQc);
    const stockConakry = numberValue(product.stockConakry, defaultStock);
    const stockQc = numberValue(product.stockQc, defaultStock);
    const visibleConakry = product.visibleConakry === false ? 0 : 1;
    const visibleQc = product.visibleQc ? 1 : 0;

    const current = productsByName.get(normalizedName);
    if (current) {
      const category = stringValue(product.category, "eveil");
      statements.push(database.prepare("UPDATE products SET category=?,image_url=?,brand=?,article_number=COALESCE(NULLIF(article_number,''),?),updated_at=? WHERE id=?")
        .bind(category, stringValue(product.imageUrl) || null, stringValue(product.brand) || null, generateArticleNumber(category), now, current.id));
      updated += 1;
      continue;
    }
    productsByName.set(normalizedName, { id: "", name_fr: frenchName });

    const category = stringValue(product.category, "eveil");
    statements.push(database.prepare("INSERT INTO products (id,article_number,name_fr,name_en,description_fr,description_en,category,price,stock,status,badge,ages,image_url,image_sheet,image_position,brand,material,dimensions,exchange_terms_fr,exchange_terms_en,visible,price_qc,price_conakry,stock_qc,stock_conakry,visible_qc,visible_conakry,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(crypto.randomUUID(), generateArticleNumber(category), frenchName, stringValue(name.en), stringValue(detail.fr), stringValue(detail.en), category, priceConakry, stockConakry, status, stringValue(product.badge) || null, stringValue(product.ages, "3+"), stringValue(product.imageUrl) || null, stringValue(product.sheet) || null, numberValue(product.position), stringValue(product.brand) || null, null, null, null, null, 1, priceQc, priceConakry, stockQc, stockConakry, visibleQc, visibleConakry, now, now));
    imported += 1;
  }

  statements.push(database.prepare("INSERT INTO settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind("catalog_initialized", "true", now));
  await database.batch(statements);
  return Response.json({ imported, updated, removed, skipped: Math.min(products.length, 250) - imported - updated });
}
