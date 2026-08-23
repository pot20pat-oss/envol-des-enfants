import { body, cmsEnv, currentAdmin, forbidden, numberValue, stringValue } from "@/lib/cms";

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const { results } = await cmsEnv().DB.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
  return Response.json({ orders: results });
}

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const data = await body(request);
  const id = stringValue(data.id) || crypto.randomUUID();
  const now = new Date().toISOString();
  const existing = await cmsEnv().DB.prepare("SELECT id FROM orders WHERE id = ?").bind(id).first();
  if (existing) {
    await cmsEnv().DB.prepare("UPDATE orders SET customer_name=?,customer_phone=?,product_name=?,quantity=?,total=?,status=?,notes=?,updated_at=? WHERE id=?")
      .bind(stringValue(data.customer_name), stringValue(data.customer_phone), stringValue(data.product_name), numberValue(data.quantity, 1), numberValue(data.total), stringValue(data.status, "new"), stringValue(data.notes), now, id).run();
  } else {
    await cmsEnv().DB.prepare("INSERT INTO orders (id,customer_name,customer_phone,product_name,quantity,total,status,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .bind(id, stringValue(data.customer_name), stringValue(data.customer_phone), stringValue(data.product_name), numberValue(data.quantity, 1), numberValue(data.total), stringValue(data.status, "new"), stringValue(data.notes), now, now).run();
  }
  return Response.json({ id });
}
