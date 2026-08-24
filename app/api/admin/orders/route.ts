import { body, cmsEnv, currentAdmin, forbidden, numberValue, stringValue } from "@/lib/cms";
import { normalizeMarket } from "@/lib/markets";

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const region = new URL(request.url).searchParams.get("region");
  const { results } = region ? await cmsEnv().DB.prepare("SELECT * FROM orders WHERE region=? ORDER BY created_at DESC").bind(normalizeMarket(region)).all() : await cmsEnv().DB.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
  return Response.json({ orders: results });
}

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const data = await body(request);
  const id = stringValue(data.id) || crypto.randomUUID();
  const now = new Date().toISOString();
  const region = normalizeMarket(data.region);
  const statuses = new Set(["new", "confirmed", "preparing", "ready", "delivered", "cancelled"]);
  const status = statuses.has(stringValue(data.status)) ? stringValue(data.status) : "new";
  const existing = await cmsEnv().DB.prepare("SELECT id FROM orders WHERE id = ?").bind(id).first();
  if (existing) {
    await cmsEnv().DB.prepare("UPDATE orders SET customer_name=?,customer_phone=?,product_name=?,quantity=?,total=?,status=?,notes=?,region=?,currency=?,delivery_zone=?,updated_at=? WHERE id=?")
      .bind(stringValue(data.customer_name), stringValue(data.customer_phone), stringValue(data.product_name), numberValue(data.quantity, 1), numberValue(data.total), status, stringValue(data.notes), region, region === "qc" ? "CAD" : "GNF", stringValue(data.delivery_zone) || null, now, id).run();
  } else {
    await cmsEnv().DB.prepare("INSERT INTO orders (id,customer_name,customer_phone,product_name,quantity,total,status,notes,region,currency,delivery_zone,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(id, stringValue(data.customer_name), stringValue(data.customer_phone), stringValue(data.product_name), numberValue(data.quantity, 1), numberValue(data.total), status, stringValue(data.notes), region, region === "qc" ? "CAD" : "GNF", stringValue(data.delivery_zone) || null, now, now).run();
  }
  return Response.json({ id });
}
