import { cmsEnv, currentAdmin, forbidden, stringValue } from "@/lib/cms";
import { createArticleNumberGenerator } from "@/lib/article-number";
import { categorizedMamaProduct } from "@/lib/doll-category";
import { withVerifiedConakryPrice } from "@/lib/reference-prices";
import { ensureArchiveProducts } from "@/lib/archive-products";
import { validateJsonBody } from "@/lib/api-validation";
import {
  createProductBindings,
  createProductSchema,
  updateProductBindings,
  updateProductSchema,
} from "./product-input";

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();

  const database = cmsEnv().DB;
  const initialized = await database.prepare("SELECT value FROM settings WHERE key=?").bind("catalog_initialized").first<{ value: string }>();
  if (!initialized) await ensureArchiveProducts(database);

  const missing = await database
    .prepare("SELECT id,category FROM products WHERE article_number IS NULL OR TRIM(article_number) = '' ORDER BY created_at,id")
    .all<{ id: string; category: string }>();

  if (missing.results.length) {
    const nextArticleNumber = await createArticleNumberGenerator(database);
    await database.batch(
      missing.results.map((product) =>
        database
          .prepare("UPDATE products SET article_number=? WHERE id=? AND (article_number IS NULL OR TRIM(article_number) = '')")
          .bind(nextArticleNumber(product.category), product.id),
      ),
    );
  }

  const { results } = await database
    .prepare("SELECT * FROM products ORDER BY updated_at DESC")
    .all();

  return Response.json({
    products: results.map(categorizedMamaProduct).map(withVerifiedConakryPrice),
  });
}

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();

  const parsed = await validateJsonBody(request, createProductSchema);
  if (!parsed.success) return parsed.response;

  const data = parsed.data;
  const name = stringValue(data.name_fr);
  const category = stringValue(data.category);
  if (!name || !category) {
    return Response.json(
      { error: "Le nom français et la catégorie sont obligatoires." },
      { status: 400 },
    );
  }

  const database = cmsEnv().DB;
  const nextArticleNumber = await createArticleNumberGenerator(database);
  const id = crypto.randomUUID();
  const articleNumber = nextArticleNumber(category);
  const now = new Date().toISOString();

  await database
    .prepare("INSERT INTO products (id,article_number,name_fr,name_en,description_fr,description_en,category,price,stock,status,badge,ages,image_url,image_sheet,image_position,brand,material,dimensions,exchange_terms_fr,exchange_terms_en,visible,price_qc,price_conakry,stock_qc,stock_conakry,visible_qc,visible_conakry,alert_threshold,featured,promo_price_qc,promo_price_conakry,variants_json,images_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind(...createProductBindings(data, id, articleNumber, name, category, now))
    .run();

  return Response.json({ id, article_number: articleNumber }, { status: 201 });
}

export async function PUT(request: Request) {
  if (!await currentAdmin(request)) return forbidden();

  const parsed = await validateJsonBody(request, updateProductSchema);
  if (!parsed.success) return parsed.response;

  const data = parsed.data;
  const id = stringValue(data.id);
  if (!id || !stringValue(data.name_fr)) {
    return Response.json({ error: "Produit incomplet." }, { status: 400 });
  }

  const database=cmsEnv().DB;
  const before=await database.prepare("SELECT * FROM products WHERE id=?").bind(id).first<Record<string,unknown>>();
  await database
    .prepare("UPDATE products SET name_fr=?,name_en=?,description_fr=?,description_en=?,category=?,price=?,stock=?,status=?,badge=?,ages=?,image_url=?,image_sheet=?,image_position=?,brand=?,material=?,dimensions=?,exchange_terms_fr=?,exchange_terms_en=?,visible=?,price_qc=?,price_conakry=?,stock_qc=?,stock_conakry=?,visible_qc=?,visible_conakry=?,alert_threshold=?,featured=?,promo_price_qc=?,promo_price_conakry=?,variants_json=?,images_json=?,updated_at=? WHERE id=?")
    .bind(...updateProductBindings(data, id, new Date().toISOString()))
    .run();

  if(before){const after=await database.prepare("SELECT * FROM products WHERE id=?").bind(id).first<Record<string,unknown>>();const key=`cms_undo:${Date.now()}:${crypto.randomUUID()}`;await database.prepare("INSERT INTO settings (key,value,updated_at) VALUES (?,?,?)").bind(key,JSON.stringify({type:"product_update",label:`Modification · ${String(before.name_fr||before.article_number||"Produit")}`,before,after,state:"applied"}),new Date().toISOString()).run();}
  return Response.json({ success: true });
}

export async function DELETE(request: Request) {
  if (!await currentAdmin(request)) return forbidden();

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Produit manquant." }, { status: 400 });
  }

  const database = cmsEnv().DB;
  const product = await database.prepare("SELECT * FROM products WHERE id=?").bind(id).first<Record<string,unknown>>();
  await database.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
  if (product) {
    const key = `deleted_product:${id}`;
    await database.prepare("INSERT INTO settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at")
      .bind(key, JSON.stringify({ name_fr: product.name_fr, name_en: product.name_en, product }), new Date().toISOString()).run();
    const undoKey=`cms_undo:${Date.now()}:${crypto.randomUUID()}`;
    await database.prepare("INSERT INTO settings (key,value,updated_at) VALUES (?,?,?)").bind(undoKey,JSON.stringify({type:"product_delete",label:`Suppression · ${String(product.name_fr||product.article_number||"Produit")}`,before:product}),new Date().toISOString()).run();
  }
  return Response.json({ success: true });
}
