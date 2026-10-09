import { cmsEnv } from "@/lib/cms";

/** Queue only: deliberately does not call QuickBooks or create invoices.
 * Checkout works unchanged unless the operator explicitly sets
 * QUICKBOOKS_ORDER_SYNC_MODE=sandbox_queue in Cloudflare.
 */
export type CheckoutSyncItem = {
  product_id: string;
  article_number: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type CheckoutSyncOrder = {
  id: string;
  region: "qc" | "conakry";
  currency: "CAD" | "GNF";
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_address: string;
  items: CheckoutSyncItem[];
  total: number;
  created_at: string;
};

const SANDBOX_REALM = "9341458454408573";

export function checkoutQueueEnabled(): boolean {
  const env = cmsEnv();
  return env.QUICKBOOKS_MODE === "sandbox" &&
    env.QUICKBOOKS_ORDER_SYNC_MODE === "sandbox_queue";
}

export async function queueSandboxCheckoutOrder(order: CheckoutSyncOrder): Promise<boolean> {
  if (!checkoutQueueEnabled()) return false;
  if (
    !/^[0-9a-f-]{36}$/i.test(order.id) ||
    !["qc", "conakry"].includes(order.region) ||
    order.currency !== (order.region === "qc" ? "CAD" : "GNF") ||
    !Number.isFinite(order.total) || order.total <= 0 ||
    !order.items.length ||
    order.items.some(i => !Number.isFinite(i.unit_price) || i.unit_price <= 0 ||
      !Number.isInteger(i.quantity) || i.quantity < 1 ||
      !Number.isFinite(i.line_total) || i.line_total <= 0)
  ) {
    throw new Error("Invalid checkout sync snapshot");
  }
  const database = cmsEnv().DB;
  const connected = await database.prepare(
    "SELECT realm_id FROM quickbooks_connections WHERE environment = 'sandbox'",
  ).first<{ realm_id: string }>();
  if (connected?.realm_id !== SANDBOX_REALM) {
    throw new Error("Expected QuickBooks sandbox connection is unavailable");
  }

  // Deterministic within a sandbox, one unique number per storefront order.
  const suffix = order.id.replace(/-/g, "").slice(0, 16).toUpperCase();
  const number = `${order.region === "qc" ? "ENVQ" : "ENVG"}-${suffix}`;
  const now = new Date().toISOString();
  const prepared = database.prepare(
    "INSERT OR IGNORE INTO quickbooks_order_sync (" +
    "order_id,source,region,currency,environment,realm_id,doc_number," +
    "order_snapshot_json,state,created_at,updated_at) " +
    "VALUES (?,'storefront',? ,?,'sandbox',?,?,?,'pending',?,?)",
  ).bind(
    order.id, order.region, order.currency, SANDBOX_REALM, number,
    JSON.stringify(order), now, now,
  );
  const response = await prepared.run();
  return Number(response.meta?.changes || 0) === 1;
}
