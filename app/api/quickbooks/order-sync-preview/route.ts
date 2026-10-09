import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";

const SANDBOX_REALM = "9341458454408573";
const CACHE_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
};

type QueueRow = {
  order_id: string;
  source: string;
  region: string;
  currency: string;
  environment: string;
  realm_id: string;
  doc_number: string;
  order_snapshot_json: string;
  state: string;
  qbo_invoice_id: string | null;
};
type LiveOrder = {
  id: string;
  source: string | null;
  status: string;
  region: string;
  currency: string;
  total: number;
  items_json: string | null;
};

type SnapshotItem = {
  product_id: string;
  article_number: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type Snapshot = {
  id: string;
  is_simulation?: boolean;
  region: string;
  currency: string;
  customer_name: string;
  total: number;
  items: SnapshotItem[];
};

const money = (value: number): number => Math.round(value * 100) / 100;
const validMoney = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/**
 * Read-only preflight. This endpoint intentionally has no QuickBooks POST,
 * no state updates, and no customer data in its response.
 */
export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  try {
    const db = cmsEnv().DB;
    const { results } = await db.prepare(
      "SELECT order_id,source,region,currency,environment,realm_id,doc_number," +
      "order_snapshot_json,state,qbo_invoice_id FROM quickbooks_order_sync " +
      "ORDER BY created_at DESC LIMIT 20",
    ).all<QueueRow>();

    const previews = [];
    for (const row of results) {
      const reasons: string[] = [];
      let snapshot: Snapshot | null = null;
      try {
        snapshot = JSON.parse(row.order_snapshot_json) as Snapshot;
      } catch {
        reasons.push("invalid_snapshot_json");
      }
      if (row.source !== "storefront") reasons.push("not_storefront_order");
      if (row.environment !== "sandbox" || row.realm_id !== SANDBOX_REALM) {
        reasons.push("not_expected_sandbox");
      }
      if (row.state !== "pending") reasons.push("not_pending");
      if (row.qbo_invoice_id) reasons.push("already_has_invoice");
      if (snapshot?.is_simulation) reasons.push("simulation_excluded");
      if (snapshot?.id !== row.order_id) reasons.push("order_id_mismatch");
      if (snapshot?.region !== row.region || snapshot?.currency !== row.currency) {
        reasons.push("market_mismatch");
      }
      if (
        (row.region !== "qc" || row.currency !== "CAD") &&
        (row.region !== "conakry" || row.currency !== "GNF")
      ) reasons.push("invalid_currency_for_market");
      if (!snapshot || !Array.isArray(snapshot.items) || snapshot.items.length === 0 ||
          snapshot.items.length > 50 || !validMoney(snapshot.total)) {
        reasons.push("invalid_order_totals");
      } else {
        const allValid = snapshot.items.every(item =>
          typeof item.product_id === "string" &&
          typeof item.name === "string" && item.name.length > 0 &&
          typeof item.article_number === "string" &&
          Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99 &&
          validMoney(item.unit_price) &&
          validMoney(item.line_total) &&
          Math.abs(money(item.quantity * item.unit_price) - money(item.line_total)) < 0.01
        );
        const total = money(snapshot.items.reduce((sum, item) => sum + item.line_total, 0));
        if (!allValid || Math.abs(total - money(snapshot.total)) >= 0.01) {
          reasons.push("inconsistent_line_items");
        }
      }

      const order = await db.prepare(
        "SELECT id,source,status,region,currency,total,items_json FROM orders WHERE id=?",
      ).bind(row.order_id).first<LiveOrder>();
      if (!order) {
        reasons.push("no_matching_checkout_order");
      } else {
        if (order.source !== "storefront") reasons.push("order_not_from_checkout");
        if (order.status === "cancelled") reasons.push("order_cancelled");
        if (order.region !== row.region || order.currency !== row.currency) {
          reasons.push("live_order_market_mismatch");
        }
        if (!snapshot || !validMoney(order.total) || !validMoney(snapshot.total) ||
            Math.abs(money(order.total) - money(snapshot.total)) >= 0.01) {
          reasons.push("live_order_total_mismatch");
        }
        try {
          const liveItems = JSON.parse(order.items_json || "") as SnapshotItem[];
          if (!snapshot || !Array.isArray(liveItems) ||
              JSON.stringify(liveItems) !== JSON.stringify(snapshot.items)) {
            reasons.push("live_items_changed");
          }
        } catch {
          reasons.push("missing_live_line_items");
        }
      }
      // Passing the data checks does NOT mean accounting is ready: customer
      // matching, SKU mapping and jurisdiction-specific taxes need approval.
      previews.push({
        order_id: row.order_id,
        market: row.region,
        currency: row.currency,
        state: row.state,
        invoice_number_reserved: row.doc_number,
        total: snapshot?.total ?? null,
        item_count: Array.isArray(snapshot?.items) ? snapshot.items.length : 0,
        data_checks_passed: reasons.length === 0,
        blocked_reasons: reasons,
        ready_to_invoice: false,
      });
    }
    return Response.json({
      environment: "sandbox",
      write_operations_performed: false,
      invoice_creation_enabled: false,
      accounting_requirements_pending: [
        "customer_currency_mapping",
        "product_sku_to_qbo_item_mapping",
        "tax_configuration_for_each_market",
        "payment_and_cancellation_reconciliation",
      ],
      inspected: previews.length,
      previews,
    }, { headers: CACHE_HEADERS });
  } catch {
    return Response.json({
      verified: false,
      error: "Prévisualisation de la synchronisation impossible. Aucune modification effectuée.",
    }, { status: 502, headers: CACHE_HEADERS });
  }
}
