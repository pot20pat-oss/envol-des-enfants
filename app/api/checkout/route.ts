import * as v from "valibot";

import { cmsEnv, numberValue, stringValue } from "@/lib/cms";
import { normalizeMarket } from "@/lib/markets";
import { validateJsonBody } from "@/lib/api-validation";

const checkoutSchema = v.object({
  customer_name: v.pipe(v.string(), v.trim(), v.minLength(2)),
  customer_phone: v.pipe(v.string(), v.trim(), v.minLength(5)),
  customer_email: v.optional(v.string()),
  delivery_address: v.pipe(v.string(), v.trim(), v.minLength(4)),
  notes: v.optional(v.string()),
  region: v.string(),
  items: v.pipe(v.array(v.object({
    product_id: v.string(),
    quantity: v.pipe(v.number(), v.minValue(1), v.maxValue(99)),
  })), v.minLength(1), v.maxLength(50)),
});

export async function POST(request: Request) {
  const parsed = await validateJsonBody(request, checkoutSchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;
  const region = normalizeMarket(data.region);
  const database = cmsEnv().DB;
  const ids = [...new Set(data.items.map((item) => item.product_id))];
  const placeholders = ids.map(() => "?").join(",");
  const { results } = await database.prepare(
    `SELECT id,article_number,name_fr,name_en,status,price_qc,price_conakry,stock_qc,stock_conakry,visible_qc,visible_conakry FROM products WHERE id IN (${placeholders})`,
  ).bind(...ids).all<Record<string, unknown>>();
  const byId = new Map(results.map((product) => [String(product.id), product]));
  let items;
  try {
    items = data.items.map((requested) => {
      const product = byId.get(requested.product_id);
      if (!product) throw new Error("Un produit du panier n’existe plus.");
      const visible = Boolean(product[`visible_${region}`]);
      const stock = Number(product[`stock_${region}`] || 0);
      if (!visible || product.status === "sold" || stock < requested.quantity) throw new Error(`${String(product.name_fr)} n’est plus disponible dans la quantité demandée.`);
      const unitPrice = numberValue(product[`price_${region}`]);
      return {
        product_id: requested.product_id,
        article_number: stringValue(product.article_number),
        name: stringValue(product.name_fr),
        quantity: requested.quantity,
        unit_price: unitPrice,
        line_total: unitPrice * requested.quantity,
      };
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Le panier doit être vérifié." }, { status: 409 });
  }
  const total = items.reduce((sum, item) => sum + item.line_total, 0);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const productName = items.map((item) => `${item.quantity}× ${item.name}`).join(" · ");
  const stockColumn = region === "qc" ? "stock_qc" : "stock_conakry";
  const statements = [
    database.prepare("INSERT INTO orders (id,customer_name,customer_phone,product_name,quantity,total,status,notes,region,currency,delivery_zone,customer_email,delivery_address,items_json,source,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(id, data.customer_name, data.customer_phone, productName, items.reduce((sum, item) => sum + item.quantity, 0), total, "new", stringValue(data.notes), region, region === "qc" ? "CAD" : "GNF", data.delivery_address, stringValue(data.customer_email) || null, data.delivery_address, JSON.stringify(items), "storefront", now, now),
    ...items.map((item) => database.prepare(`UPDATE products SET ${stockColumn} = ${stockColumn} - ?, updated_at=? WHERE id=? AND ${stockColumn} >= ?`)
      .bind(item.quantity, now, item.product_id, item.quantity)),
  ];
  const batchResults = await database.batch(statements);
  if (batchResults.slice(1).some((result) => Number(result.meta?.changes || 0) !== 1)) {
    await database.prepare("DELETE FROM orders WHERE id=?").bind(id).run();
    return Response.json({ error: "Le stock a changé pendant la commande. Veuillez vérifier le panier." }, { status: 409 });
  }
  return Response.json({ id, total, status: "new" }, { status: 201 });
}
