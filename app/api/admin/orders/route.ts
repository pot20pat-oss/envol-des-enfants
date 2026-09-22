import * as v from "valibot";

import { cmsEnv, currentAdmin, forbidden, numberValue, stringValue } from "@/lib/cms";
import { normalizeMarket } from "@/lib/markets";
import { optionalNumericInput, optionalTextInput, validateJsonBody } from "@/lib/api-validation";

const orderSchema = v.looseObject({
  id: optionalTextInput,
  customer_name: optionalTextInput,
  customer_phone: optionalTextInput,
  product_name: optionalTextInput,
  quantity: optionalNumericInput,
  total: optionalNumericInput,
  status: optionalTextInput,
  notes: optionalTextInput,
  region: optionalTextInput,
  delivery_zone: optionalTextInput,
});

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const region = new URL(request.url).searchParams.get("region");
  const { results } = region === "all" || !region ? await cmsEnv().DB.prepare("SELECT * FROM orders ORDER BY created_at DESC").all() : await cmsEnv().DB.prepare("SELECT * FROM orders WHERE region=? ORDER BY created_at DESC").bind(normalizeMarket(region)).all();
  return Response.json({ orders: results });
}

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const parsed = await validateJsonBody(request, orderSchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;
  const id = stringValue(data.id) || crypto.randomUUID();
  const now = new Date().toISOString();
  const region = normalizeMarket(data.region);
  const statuses = new Set(["new", "confirmed", "preparing", "ready", "delivered", "cancelled"]);
  const status = statuses.has(stringValue(data.status)) ? stringValue(data.status) : "new";
  const database = cmsEnv().DB;
  const existing = await database.prepare("SELECT id,status,region,items_json FROM orders WHERE id = ?").bind(id).first<Record<string, unknown>>();
  if (existing) {
    const previousStatus = stringValue(existing.status);
    if (previousStatus !== "cancelled" && status === "cancelled" && existing.items_json) {
      try {
        const items = JSON.parse(String(existing.items_json)) as Array<{ product_id?: string; quantity?: number }>;
        const existingRegion = normalizeMarket(existing.region);
        const stockColumn = existingRegion === "qc" ? "stock_qc" : "stock_conakry";
        const restocks = items
          .filter((item) => item.product_id && Number(item.quantity) > 0)
          .map((item) => database.prepare(`UPDATE products SET ${stockColumn} = ${stockColumn} + ?, updated_at=? WHERE id=?`)
            .bind(Number(item.quantity), now, String(item.product_id)));
        if (restocks.length) await database.batch(restocks);
      } catch {}
    }
    await database.prepare("UPDATE orders SET customer_name=?,customer_phone=?,product_name=?,quantity=?,total=?,status=?,notes=?,region=?,currency=?,delivery_zone=?,updated_at=? WHERE id=?")
      .bind(stringValue(data.customer_name), stringValue(data.customer_phone), stringValue(data.product_name), numberValue(data.quantity, 1), numberValue(data.total), status, stringValue(data.notes), region, region === "qc" ? "CAD" : "GNF", stringValue(data.delivery_zone) || null, now, id).run();
  } else {
    await database.prepare("INSERT INTO orders (id,customer_name,customer_phone,product_name,quantity,total,status,notes,region,currency,delivery_zone,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(id, stringValue(data.customer_name), stringValue(data.customer_phone), stringValue(data.product_name), numberValue(data.quantity, 1), numberValue(data.total), status, stringValue(data.notes), region, region === "qc" ? "CAD" : "GNF", stringValue(data.delivery_zone) || null, now, now).run();
  }
  return Response.json({ id });
}


export async function DELETE(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Commande invalide." }, { status: 400 });
  const database = cmsEnv().DB;
  const order = await database.prepare("SELECT * FROM orders WHERE id=?").bind(id).first<Record<string, unknown>>();
  if (!order) return Response.json({ error: "Commande introuvable." }, { status: 404 });

  // Suppression directe autorisée. Si la commande est encore active, restaurer
  // d'abord son stock exactement comme lors d'une annulation.
  if (stringValue(order.status) !== "cancelled" && order.items_json) {
    try {
      const items=JSON.parse(String(order.items_json)) as Array<{product_id?:string;quantity?:number}>;
      const region=normalizeMarket(order.region);
      const stockColumn=region==="qc"?"stock_qc":"stock_conakry";
      const now=new Date().toISOString();
      const restocks=items.filter(item=>item.product_id&&Number(item.quantity)>0).map(item=>database.prepare(`UPDATE products SET ${stockColumn} = ${stockColumn} + ?, updated_at=? WHERE id=?`).bind(Number(item.quantity),now,String(item.product_id)));
      if(restocks.length)await database.batch(restocks);
    } catch {}
  }
  await database.prepare("DELETE FROM orders WHERE id=?").bind(id).run();
  const undoKey=`cms_undo:${Date.now()}:${crypto.randomUUID()}`;await database.prepare("INSERT INTO settings (key,value,updated_at) VALUES (?,?,?)").bind(undoKey,JSON.stringify({type:"order_delete",table:"orders",label:`Suppression commande · ${String(order.id)}`,before:order}),new Date().toISOString()).run();
  return Response.json({ ok: true });
}
