import { body, cmsEnv, currentAdmin, forbidden, numberValue, stringValue } from "@/lib/cms";
import { normalizeMarket } from "@/lib/markets";

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const region = normalizeMarket(new URL(request.url).searchParams.get("region"));
  const { results } = await cmsEnv().DB.prepare("SELECT stock_movements.*,products.name_fr AS product_name FROM stock_movements INNER JOIN products ON products.id=stock_movements.product_id WHERE stock_movements.region=? ORDER BY stock_movements.created_at DESC LIMIT 100").bind(region).all();
  return Response.json({ movements: results });
}

export async function POST(request: Request) {
  const admin = await currentAdmin(request);
  if (!admin) return forbidden();
  const data = await body(request);
  const region = normalizeMarket(data.region);
  const column = region === "qc" ? "stock_qc" : "stock_conakry";
  const product = await cmsEnv().DB.prepare(`SELECT id,${column} AS stock FROM products WHERE id=?`).bind(stringValue(data.product_id)).first<{ id: string; stock: number }>();
  if (!product) return Response.json({ error: "Produit introuvable." }, { status: 404 });
  const previous = Number(product.stock || 0);
  const next = numberValue(data.stock);
  const now = new Date().toISOString();
  const update = region === "conakry" ? cmsEnv().DB.prepare("UPDATE products SET stock_conakry=?,stock=?,updated_at=? WHERE id=?").bind(next, next, now, product.id) : cmsEnv().DB.prepare("UPDATE products SET stock_qc=?,updated_at=? WHERE id=?").bind(next, now, product.id);
  await cmsEnv().DB.batch([update, cmsEnv().DB.prepare("INSERT INTO stock_movements (id,product_id,region,previous_stock,new_stock,delta,reason,admin_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), product.id, region, previous, next, next - previous, stringValue(data.reason, "Ajustement manuel"), admin.id, now)]);
  return Response.json({ success: true, stock: next });
}
