import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { checkoutQueueEnabled } from "@/lib/quickbooks-order-queue";

/** Admin-only overview; no invoice creation and no customer data returned. */
export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
  try {
    const database = cmsEnv().DB;
    const { results } = await database.prepare(
      "SELECT region,state,COUNT(*) AS count FROM quickbooks_order_sync " +
      "GROUP BY region,state ORDER BY region,state",
    ).all<{ region: string; state: string; count: number }>();
    const configured = await database.prepare(
      "SELECT realm_id FROM quickbooks_connections WHERE environment='sandbox'",
    ).first<{ realm_id: string }>();
    return Response.json({
      queue_enabled: checkoutQueueEnabled(),
      invoice_creation_enabled: false,
      connected_to_expected_sandbox: configured?.realm_id === "9341458454408573",
      sync_rows: results.map(row => ({
        region: row.region,
        state: row.state,
        count: row.count,
      })),
      note: "La file d'attente est désactivée par défaut. Aucune facture automatique n'est envoyée.",
    }, { headers });
  } catch {
    return Response.json({
      verified: false,
      error: "Lecture du suivi QuickBooks impossible. Aucune facture créée.",
    }, { status: 502, headers });
  }
}
