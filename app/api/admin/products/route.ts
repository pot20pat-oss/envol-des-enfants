import { body, cmsEnv, currentAdmin, forbidden, numberValue, stringValue } from "@/lib/cms";
import { createArticleNumberGenerator } from "@/lib/article-number";
import { categorizedMamaProduct } from "@/lib/doll-category";
import { withVerifiedConakryPrice } from "@/lib/reference-prices";
import { ensureArchiveProducts } from "@/lib/archive-products";

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const database = cmsEnv().DB;
  await ensureArchiveProducts(database);
  const missing = await database.prepare("SELECT id,category FROM products WHERE article_number IS NULL OR TRIM(article_number) = '' ORDER BY created_at,id").all<{ id: string; category: string }>();
  if (missing.results.length) {
    const nextArticleNumber = await createArticleNumberGenerator(database);
    await database.batch(
      missing.results.map((product) =>
        database.prepare("UPDATE products SET article_number=? WHERE id=? AND (article_number IS NULL OR TRIM(article_number) = '')")
          .bind(nextArticleNumber(product.category), product.id),
      ),
    );
  }
  const { results } = await database.prepare("SELECT * FROM products ORDER BY updated_at DESC").all();
  return Response.json({ products: results.map(categorizedMamaProduct).map(withVerifiedConakryPrice) });
}

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const data = await body(request);
  const name = stringValue(data.name_fr);
  const category = stringValue(data.category);
  if (!name || !category) return Response.json({ error: "Le nom français et la catégorie sont obligatoires." }, { status: 400 });
  const database = cmsEnv().DB;
  const nextArticleNumber = await createArticleNumberGenerator(database);
  const id = crypto.randomUUID();
  const articleNumber = nextArticleNumber(category);
  const now = new Date().toISOString();
  const conakryPrice = numberValue(data.price_conakry ?? data.price);
  const conakryStock = numberValue(data.stock_conakry ?? data.stock, 1);
  await database.prepare("INSERT INTO products (id,article_number,name_fr,name_en,description_fr,description_en,category,price,stock,status,badge,ages,image_url,image_sheet,image_position,brand,material,dimensions,exchange_terms_fr,exchange_terms_en,visible,price_qc,price_conakry,stock_qc,stock_conakry,visible_qc,visible_conakry,alert_threshold,featured,promo_price_qc,promo_price_conakry,variants_json,images_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind(id, articleNumber, name, stringValue(data.name_en), stringValue(data.description_fr), stringValue(data.description_en), category, conakryPrice, conakryStock, stringValue(data.status, "available"), stringValue(data.badge) || null, stringValue(data.ages, "3+"), stringValue(data.image_url) || null, stringValue(data.image_sheet) || null, numberValue(data.image_position), stringValue(data.brand) || null, stringValue(data.material) || null, stringValue(data.dimensions) || null, stringValue(data.exchange_terms_fr) || null, stringValue(data.exchange_terms_en) || null, data.visible === false ? 0 : 1, numberValue(data.price_qc), conakryPrice, numberValue(data.stock_qc), conakryStock, data.visible_qc ? 1 : 0, data.visible_conakry === false || data.visible_conakry === 0 ? 0 : 1, numberValue(data.alert_threshold, 2), data.featured ? 1 : 0, numberValue(data.promo_price_qc) || null, numberValue(data.promo_price_conakry) || null, stringValue(data.variants_json, "[]"), stringValue(data.images_json, "[]"), now, now).run();
  return Response.json({ id, article_number: articleNumber }, { status: 201 });
}

export async function PUT(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const data = await body(request);
  const id = stringValue(data.id);
  if (!id || !stringValue(data.name_fr)) return Response.json({ error: "Produit incomplet." }, { status: 400 });
  const conakryPrice = numberValue(data.price_conakry ?? data.price);
  const conakryStock = numberValue(data.stock_conakry ?? data.stock);
  await cmsEnv().DB.prepare("UPDATE products SET name_fr=?,name_en=?,description_fr=?,description_en=?,category=?,price=?,stock=?,status=?,badge=?,ages=?,image_url=?,image_sheet=?,image_position=?,brand=?,material=?,dimensions=?,exchange_terms_fr=?,exchange_terms_en=?,visible=?,price_qc=?,price_conakry=?,stock_qc=?,stock_conakry=?,visible_qc=?,visible_conakry=?,alert_threshold=?,featured=?,promo_price_qc=?,promo_price_conakry=?,variants_json=?,images_json=?,updated_at=? WHERE id=?")
    .bind(stringValue(data.name_fr), stringValue(data.name_en), stringValue(data.description_fr), stringValue(data.description_en), stringValue(data.category), conakryPrice, conakryStock, stringValue(data.status, "available"), stringValue(data.badge) || null, stringValue(data.ages, "3+"), stringValue(data.image_url) || null, stringValue(data.image_sheet) || null, numberValue(data.image_position), stringValue(data.brand) || null, stringValue(data.material) || null, stringValue(data.dimensions) || null, stringValue(data.exchange_terms_fr) || null, stringValue(data.exchange_terms_en) || null, data.visible === false || data.visible === 0 ? 0 : 1, numberValue(data.price_qc), conakryPrice, numberValue(data.stock_qc), conakryStock, data.visible_qc ? 1 : 0, data.visible_conakry === false || data.visible_conakry === 0 ? 0 : 1, numberValue(data.alert_threshold, 2), data.featured ? 1 : 0, numberValue(data.promo_price_qc) || null, numberValue(data.promo_price_conakry) || null, stringValue(data.variants_json, "[]"), stringValue(data.images_json, "[]"), new Date().toISOString(), id).run();
  return Response.json({ success: true });
}

export async function DELETE(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Produit manquant." }, { status: 400 });
  await cmsEnv().DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
  return Response.json({ success: true });
}
