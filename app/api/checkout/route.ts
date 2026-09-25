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

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}

async function sendOrderEmails(database: D1Database, data: {
  id: string; region: string; customer_name: string; customer_email?: string; customer_phone: string;
  delivery_address: string; total: number; currency: string; items: Array<{ name: string; quantity: number; unit_price: number; line_total: number }>;
}) {
  const runtime = cmsEnv();
  if (!runtime.RESEND_API_KEY) return;
  const keys = [`${data.region}_order_notification_email`, `${data.region}_store_name`];
  const placeholders = keys.map(() => "?").join(",");
  const { results } = await database.prepare(`SELECT key,value FROM settings WHERE key IN (${placeholders})`).bind(...keys).all<{ key: string; value: string }>();
  const settings = Object.fromEntries(results.map((entry) => [entry.key, entry.value]));
  const storeName = settings[`${data.region}_store_name`] || "L’Envol des Enfants";
  const ownerEmail = settings[`${data.region}_order_notification_email`]?.trim();
  const from = runtime.ORDER_EMAIL_FROM || "L’Envol des Enfants <onboarding@resend.dev>";
  const itemRows = data.items.map((item) => `<tr><td>${escapeHtml(item.quantity)} × ${escapeHtml(item.name)}</td><td style="text-align:right">${escapeHtml(item.line_total)} ${escapeHtml(data.currency)}</td></tr>`).join("");
  const send = async (to: string, subject: string, html: string) => {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { "Authorization": `Bearer ${runtime.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [to], subject, html }) });
    if (!response.ok) console.error("Order email failed", response.status, await response.text());
  };
  const summary = `<h2>Commande ${escapeHtml(data.id)}</h2><p><strong>Client :</strong> ${escapeHtml(data.customer_name)}<br><strong>Téléphone :</strong> ${escapeHtml(data.customer_phone)}<br><strong>Adresse :</strong> ${escapeHtml(data.delivery_address)}</p><table style="width:100%">${itemRows}</table><p><strong>Total : ${escapeHtml(data.total)} ${escapeHtml(data.currency)}</strong></p>`;
  if (ownerEmail) await send(ownerEmail, `Nouvelle commande — ${storeName}`, summary);
  const customerEmail = data.customer_email?.trim();
  if (customerEmail) await send(customerEmail, `Confirmation de votre commande — ${storeName}`, `<p>Bonjour ${escapeHtml(data.customer_name)},</p><p>Nous avons bien reçu votre commande.</p>${summary}<p>Merci.</p>`);
}

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
  const currency = region === "qc" ? "CAD" : "GNF";
  try {
    await sendOrderEmails(database, { id, region, customer_name: data.customer_name, customer_email: stringValue(data.customer_email) || undefined, customer_phone: data.customer_phone, delivery_address: data.delivery_address, total, currency, items });
  } catch (error) {
    console.error("Order notification error", error);
  }
  return Response.json({ id, total, status: "new" }, { status: 201 });
}
