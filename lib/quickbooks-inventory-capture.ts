import { cmsEnv } from "@/lib/cms";

type SaleLine = { product_id: string; quantity: number };

/**
 * Records already-committed storefront sales in a sandbox-only, review-only
 * ledger. No QuickBooks API call. Does not alter stock.
 *
 * This is deliberately post-commit and best-effort: a failure MUST NOT fail
 * checkout. Future reconciliation must backfill from orders.items_json using
 * the same deterministic event keys.
 */
export async function captureSandboxCheckoutInventorySale(order: {
  id: string;
  region: "qc" | "conakry";
  items: SaleLine[];
}): Promise<number> {
  const runtime = cmsEnv();
  if (
    runtime.QUICKBOOKS_MODE !== "sandbox" ||
    runtime.QUICKBOOKS_INVENTORY_AUDIT_MODE !== "sandbox_capture"
  ) return 0;

  const sandboxRealm = "9341458454408573";
  const database = runtime.DB;
  const connection = await database.prepare(
    "SELECT realm_id FROM quickbooks_connections WHERE environment='sandbox'",
  ).first<{ realm_id: string }>();
  if (connection?.realm_id !== sandboxRealm) {
    throw new Error("Unexpected QuickBooks sandbox company for inventory capture");
  }

  if (!/^[0-9a-f-]{36}$/i.test(order.id) ||
      (order.region !== "qc" && order.region !== "conakry") ||
      order.items.length === 0 || order.items.length > 50) {
    throw new Error("Invalid checkout inventory identity");
  }

  // The storefront can contain the same product in multiple order lines.
  // Aggregate so one sale produces exactly one event per product, per market.
  const quantities = new Map<string, number>();
  for (const item of order.items) {
    if (!item.product_id || !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 || item.quantity > 99) {
      throw new Error("Invalid checkout inventory quantity");
    }
    quantities.set(item.product_id,
      (quantities.get(item.product_id) || 0) + item.quantity);
  }

  const observed = new Date().toISOString();
  const prepared = [...quantities].map(([productId, quantity]) =>
    database.prepare(
      "INSERT OR IGNORE INTO quickbooks_inventory_events " +
      "(id,product_id,region,environment,realm_id,origin,event_key,kind," +
      "stock_before,stock_after,quantity_change,source_revision,qbo_item_id," +
      "state,observed_at,updated_at) " +
      "VALUES (?,?,?,'sandbox',?,'cms',?,'sale',NULL,NULL,?,?,NULL," +
      "'manual_review',?,?)"
    ).bind(
      crypto.randomUUID(), productId, order.region, sandboxRealm,
      "storefront_sale:" + order.id + ":" + productId,
      -quantity, order.id, observed, observed,
    )
  );
  const results = await database.batch(prepared);
  return results.reduce((total, row) => total + Number(row.meta?.changes || 0), 0);
}
