import * as v from "valibot";

import { cmsEnv, currentAdmin, forbidden, numberValue, stringValue } from "@/lib/cms";
import { normalizeMarket } from "@/lib/markets";
import { numericInput, optionalTextInput, validateJsonBody } from "@/lib/api-validation";

const stockSchema = v.looseObject({
  product_id: v.string(),
  region: v.optional(v.string()),
  stock: numericInput,
  reason: optionalTextInput,
});

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const region = normalizeMarket(new URL(request.url).searchParams.get("region"));
  const { results } = await cmsEnv().DB.prepare("SELECT stock_movements.*,products.name_fr AS product_name FROM stock_movements INNER JOIN products ON products.id=stock_movements.product_id WHERE stock_movements.region=? ORDER BY stock_movements.created_at DESC LIMIT 100").bind(region).all();
  return Response.json({ movements: results });
}

export async function POST(request: Request) {
  const admin = await currentAdmin(request);
  if (!admin) return forbidden();
  const parsed = await validateJsonBody(request, stockSchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;
  const region = normalizeMarket(data.region);
  const column = region === "qc" ? "stock_qc" : "stock_conakry";
  const product = await cmsEnv().DB.prepare(`SELECT id,${column} AS stock FROM products WHERE id=?`).bind(stringValue(data.product_id)).first<{ id: string; stock: number }>();
  if (!product) return Response.json({ error: "Produit introuvable." }, { status: 404 });
  const previous = Number(product.stock || 0);
  const next = numberValue(data.stock);
  const now = new Date().toISOString();
  const runtime = cmsEnv();
  const db = runtime.DB;
  const movementId = crypto.randomUUID();
  const update = region === "conakry"
    ? db.prepare("UPDATE products SET stock_conakry=?,stock=?,updated_at=? WHERE id=?").bind(next, next, now, product.id)
    : db.prepare("UPDATE products SET stock_qc=?,updated_at=? WHERE id=?").bind(next, now, product.id);
  const statements = [
    update,
    db.prepare("INSERT INTO stock_movements (id,product_id,region,previous_stock,new_stock,delta,reason,admin_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)")
      .bind(movementId, product.id, region, previous, next, next - previous, stringValue(data.reason, "Ajustement manuel"), admin.id, now),
  ];

  // Opt-in only: records a shadow audit event. No calls to QuickBooks and no
  // automatic stock synchronization. The event is written in the same D1
  // transaction as the existing CMS movement so it cannot be half-recorded.
  if (
    runtime.QUICKBOOKS_MODE === "sandbox" &&
    runtime.QUICKBOOKS_INVENTORY_AUDIT_MODE === "sandbox_capture" &&
    next !== previous
  ) {
    const sandboxRealm = "9341458454408573";
    const connection = await db.prepare(
      "SELECT realm_id FROM quickbooks_connections WHERE environment='sandbox'",
    ).first<{ realm_id: string }>();
    if (connection?.realm_id !== sandboxRealm) {
      return Response.json({
        error: "Journal Sandbox indisponible. Aucun changement de stock effectué.",
      }, { status: 409 });
    }
    statements.push(
      db.prepare(
        "INSERT OR IGNORE INTO quickbooks_inventory_events " +
        "(id,product_id,region,environment,realm_id,origin,event_key,kind," +
        "stock_before,stock_after,quantity_change,source_revision,qbo_item_id," +
        "state,observed_at,updated_at) " +
        "VALUES (?,?,?,'sandbox',?,'cms',?,'manual_adjustment',?,?,?,?,NULL," +
        "'manual_review',?,?)",
      ).bind(
        crypto.randomUUID(), product.id, region, sandboxRealm,
        "stock_movement:" + movementId, previous, next, next - previous,
        movementId, now, now,
      ),
    );
  }

  await db.batch(statements);
  return Response.json({ success: true, stock: next });
}


export async function PATCH(request: Request) {
  const admin=await currentAdmin(request);if(!admin)return forbidden();
  const db=cmsEnv().DB;const now=new Date().toISOString();
  const {results}=await db.prepare("SELECT id,stock_qc,stock_conakry FROM products WHERE COALESCE(stock_qc,0)<=0 OR COALESCE(stock_conakry,0)<=0").all<{id:string;stock_qc:number;stock_conakry:number}>();
  const statements=[];
  for(const product of results){
    if(Number(product.stock_qc||0)<=0){statements.push(db.prepare("UPDATE products SET stock_qc=1,updated_at=? WHERE id=?").bind(now,product.id));statements.push(db.prepare("INSERT INTO stock_movements (id,product_id,region,previous_stock,new_stock,delta,reason,admin_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),product.id,"qc",Number(product.stock_qc||0),1,1-Number(product.stock_qc||0),"Correction globale stock initial",admin.id,now))}
    if(Number(product.stock_conakry||0)<=0){statements.push(db.prepare("UPDATE products SET stock_conakry=1,stock=1,updated_at=? WHERE id=?").bind(now,product.id));statements.push(db.prepare("INSERT INTO stock_movements (id,product_id,region,previous_stock,new_stock,delta,reason,admin_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),product.id,"conakry",Number(product.stock_conakry||0),1,1-Number(product.stock_conakry||0),"Correction globale stock initial",admin.id,now))}
  }
  if(statements.length)await db.batch(statements);
  return Response.json({success:true,products:results.length,updates:statements.length/2});
}
