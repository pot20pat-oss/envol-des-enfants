import { cmsEnv, currentAdmin, forbidden, numberValue, stringValue } from "@/lib/cms";
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
  const admin = await currentAdmin(request);
  if (!admin) return forbidden();

  const parsed = await validateJsonBody(request, updateProductSchema);
  if (!parsed.success) return parsed.response;

  const data = parsed.data;
  const id = stringValue(data.id);
  if (!id || !stringValue(data.name_fr)) {
    return Response.json({ error: "Produit incomplet." }, { status: 400 });
  }

  const runtime = cmsEnv();
  const database = runtime.DB;
  const before = await database.prepare("SELECT * FROM products WHERE id=?")
    .bind(id).first<Record<string, unknown>>();
  if (!before) return Response.json({ error: "Produit introuvable." }, { status: 404 });
  const now = new Date().toISOString();

  const statements = [database.prepare(
    "UPDATE products SET name_fr=?,name_en=?,description_fr=?,description_en=?,category=?,price=?,stock=?,status=?,badge=?,ages=?,image_url=?,image_sheet=?,image_position=?,brand=?,material=?,dimensions=?,exchange_terms_fr=?,exchange_terms_en=?,visible=?,price_qc=?,price_conakry=?,stock_qc=?,stock_conakry=?,visible_qc=?,visible_conakry=?,alert_threshold=?,featured=?,promo_price_qc=?,promo_price_conakry=?,variants_json=?,images_json=?,updated_at=? WHERE id=?",
  ).bind(...updateProductBindings(data, id, now))];

  // Sandbox-only opt-in: on a real stock change from product editor, write the
  // stock movement and an idempotent review event in the SAME D1 batch as the
  // product update. No QuickBooks inventory adjustment is made.
  if (
    runtime.QUICKBOOKS_MODE === "sandbox" &&
    runtime.QUICKBOOKS_INVENTORY_AUDIT_MODE === "sandbox_capture"
  ) {
    const realm = "9341458454408573";
    const connection = await database.prepare(
      "SELECT realm_id FROM quickbooks_connections WHERE environment='sandbox'",
    ).first<{ realm_id: string }>();
    if (connection?.realm_id !== realm) {
      return Response.json({
        error: "Journal Sandbox indisponible. Modification non enregistrée.",
      }, { status: 409 });
    }

    for (const region of ["qc", "conakry"] as const) {
      const key = region === "qc" ? "stock_qc" : "stock_conakry";
      const oldStock = Number(before[key] ?? 0);
      // Match the values actually written by updateProductBindings.
      const newStock = region === "qc"
        ? numberValue(data.stock_qc)
        : numberValue(data.stock_conakry ?? data.stock);
      if (newStock === oldStock) continue;

      const movementId = crypto.randomUUID();
      const eventId = crypto.randomUUID();
      const delta = newStock - oldStock;
      statements.push(database.prepare(
        "INSERT INTO stock_movements (id,product_id,region,previous_stock,new_stock,delta,reason,admin_id,created_at) " +
        "VALUES (?,?,?,?,?,?,?,?,?)",
      ).bind(movementId, id, region, oldStock, newStock, delta, "Modification depuis éditeur de produit", admin.id, now));

      statements.push(database.prepare(
        "INSERT OR IGNORE INTO quickbooks_inventory_events " +
        "(id,product_id,region,environment,realm_id,origin,event_key,kind," +
        "stock_before,stock_after,quantity_change,source_revision,qbo_item_id," +
        "state,observed_at,updated_at) " +
        "VALUES (?,?,?,'sandbox',?,'cms',?,'manual_adjustment',?,?,?,?,NULL," +
        "'manual_review',?,?)",
      ).bind(eventId, id, region, realm, "stock_movement:" + movementId,
        oldStock, newStock, delta, movementId, now, now));
    }
  }

  await database.batch(statements);
  const after = await database.prepare("SELECT * FROM products WHERE id=?")
    .bind(id).first<Record<string, unknown>>();
  const undoKey = `cms_undo:${Date.now()}:${crypto.randomUUID()}`;
  await database.prepare("INSERT INTO settings (key,value,updated_at) VALUES (?,?,?)")
    .bind(undoKey, JSON.stringify({
      type: "product_update",
      label: `Modification · ${String(before.name_fr || before.article_number || "Produit")}`,
      before, after, state: "applied",
    }), new Date().toISOString()).run();
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
