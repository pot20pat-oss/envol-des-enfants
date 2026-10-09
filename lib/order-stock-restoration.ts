import { cmsEnv } from "@/lib/cms";

const SANDBOX_REALM = "9341458454408573";
export type RestockOrder = {
  id: string;
  status: string;
  region: "qc" | "conakry";
  items_json: string | null;
};
export type RestockLine = { product_id: string; quantity: number };

export function parseRestockLines(json: string | null): RestockLine[] {
  if (!json) return [];
  const value: unknown = JSON.parse(json);
  if (!Array.isArray(value) || value.length > 50) throw new Error("Lignes de commande invalides.");
  const quantities = new Map<string, number>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object") throw new Error("Ligne de commande invalide.");
    const row = entry as Record<string, unknown>;
    if (typeof row.product_id !== "string" || !row.product_id.trim() ||
        !Number.isSafeInteger(row.quantity) || Number(row.quantity) <= 0 ||
        Number(row.quantity) > 99) {
      throw new Error("Quantite ou produit de commande invalide.");
    }
    quantities.set(row.product_id, (quantities.get(row.product_id) ?? 0) + Number(row.quantity));
  }
  return [...quantities].map(([product_id, quantity]) => ({ product_id, quantity }));
}

/**
 * Prepare an atomic stock restoration in the SAME D1 batch as the order status
 * change or deletion. Every write is guarded by the previously-read order
 * status. A competing cancellation that commits first therefore prevents
 * later duplicate restocks.
 *
 * Review-only inventory events are optional and never call the Intuit API.
 */
export async function buildStockRestoreStatements(args: {
  db: D1Database;
  order: RestockOrder;
  now: string;
  adminId: string;
  lines: RestockLine[];
}): Promise<D1PreparedStatement[]> {
  const { db, order, now, adminId, lines } = args;
  if (!lines.length) return [];
  const col = order.region === "qc" ? "stock_qc" : "stock_conakry";
  const ids = lines.map((item) => item.product_id);
  const holders = ids.map(() => "?").join(",");
  const { results: available } = await db.prepare(
    `SELECT id FROM products WHERE id IN (${holders})`,
  ).bind(...ids).all<{ id: string }>();
  if (available.length !== ids.length) {
    throw new Error("Produit introuvable : la commande et le stock n'ont pas ete modifies.");
  }

  const runtime = cmsEnv();
  let auditEnabled =
    runtime.QUICKBOOKS_MODE === "sandbox" &&
    runtime.QUICKBOOKS_INVENTORY_AUDIT_MODE === "sandbox_capture";
  if (auditEnabled) {
    try {
      const connection = await db.prepare(
        "SELECT realm_id FROM quickbooks_connections WHERE environment='sandbox'",
      ).first<{ realm_id: string }>();
      auditEnabled = connection?.realm_id === SANDBOX_REALM;
    } catch {
      auditEnabled = false;
    }
    if (!auditEnabled) {
      console.warn("QuickBooks cancellation stock audit unavailable; CMS order remains actionable");
    }
  }

  const statements: D1PreparedStatement[] = [];
  for (const line of lines) {
    const { product_id: productId, quantity } = line;
    const predicate = "EXISTS (SELECT 1 FROM orders WHERE id=? AND status=?)";
    statements.push(db.prepare(
      `UPDATE products SET ${col}=${col}+?,updated_at=? WHERE id=? AND ${predicate}`,
    ).bind(quantity, now, productId, order.id, order.status));

    const movementId = crypto.randomUUID();
    statements.push(db.prepare(
      "INSERT INTO stock_movements " +
      "(id,product_id,region,previous_stock,new_stock,delta,reason,admin_id,created_at) " +
      `SELECT ?,id,?,${col}-?,${col},?,?,?,? FROM products WHERE id=? AND ${predicate}`,
    ).bind(
      movementId, order.region, quantity, quantity,
      "Remise en stock après annulation ou suppression de commande",
      adminId, now, productId, order.id, order.status,
    ));

    if (auditEnabled) {
      statements.push(db.prepare(
        "INSERT OR IGNORE INTO quickbooks_inventory_events " +
        "(id,product_id,region,environment,realm_id,origin,event_key,kind," +
        "stock_before,stock_after,quantity_change,source_revision,qbo_item_id," +
        "state,observed_at,updated_at) " +
        `SELECT ?,id,?,'sandbox',?,'cms',?,'cancellation',${col}-?,${col},?,? ,NULL,` +
        `'manual_review',?,? FROM products WHERE id=? AND ${predicate}`,
      ).bind(
        crypto.randomUUID(), order.region, SANDBOX_REALM,
        "order_cancel:" + order.id + ":" + productId,
        quantity, quantity, order.id, now, now,
        productId, order.id, order.status,
      ));
    }
  }
  return statements;
}
