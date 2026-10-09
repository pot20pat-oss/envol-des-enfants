import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";

const HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
};

/**
 * Admin-only, read-only inventory journal audit.
 * Does not connect to Intuit, make an inventory adjustment,
 * create product mappings, or enable synchronization.
 */
export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  try {
    const runtime = cmsEnv();
    const db = runtime.DB;
    const [movements, orders, mappings, events] = await Promise.all([
      db.prepare(
        "SELECT region, COUNT(*) AS count, " +
        "SUM(CASE WHEN delta > 0 THEN 1 ELSE 0 END) AS increases, " +
        "SUM(CASE WHEN delta < 0 THEN 1 ELSE 0 END) AS decreases " +
        "FROM stock_movements GROUP BY region ORDER BY region"
      ).all<{ region: string; count: number; increases: number; decreases: number }>(),
      db.prepare(
        "SELECT region, COUNT(*) AS count FROM orders WHERE source='storefront' " +
        "GROUP BY region ORDER BY region"
      ).all<{ region: string; count: number }>(),
      db.prepare(
        "SELECT region,state, COUNT(*) AS count FROM quickbooks_product_mappings " +
        "WHERE environment='sandbox' GROUP BY region,state ORDER BY region,state"
      ).all<{ region: string; state: string; count: number }>(),
      db.prepare(
        "SELECT region,origin,state, COUNT(*) AS count FROM quickbooks_inventory_events " +
        "WHERE environment='sandbox' GROUP BY region,origin,state ORDER BY region,origin,state"
      ).all<{ region: string; origin: string; state: string; count: number }>(),
    ]);

    return Response.json({
      verified: true,
      environment: "sandbox",
      read_only: true,
      bidirectional_sync_active: false,
      cms_manual_stock_capture_enabled:
        runtime.QUICKBOOKS_MODE === "sandbox" &&
        runtime.QUICKBOOKS_INVENTORY_AUDIT_MODE === "sandbox_capture",
      cms_product_editor_stock_capture_enabled: cmsEnv().QUICKBOOKS_MODE === 'sandbox' && cmsEnv().QUICKBOOKS_INVENTORY_AUDIT_MODE === 'sandbox_capture',
      stock_changed: false,
      quickbooks_adjustments_created: false,
      manual_stock_movements: movements.results,
      storefront_order_counts: orders.results,
      sandbox_product_mappings: mappings.results,
      sandbox_inventory_events: events.results,
      limitations: [
        "Le checkout reduit le stock mais ne cree pas de stock_movement associe a la commande.",
        "La capture des ajustements manuels via la page Stocks exige l'activation explicite du mode sandbox_capture.",
        "Les modifications de stock via l'editeur de produits sont journalisees dans le mode sandbox_capture.",
        "Les annulations et retours doivent etre rapproches de la facture QuickBooks.",
        "Aucun ajustement automatique QuickBooks vers CMS, ni CMS vers QuickBooks, n'est encore implemente.",
        "Le changement d'inventaire QuickBooks peut modifier la valorisation comptable et exige des regles validees.",
      ],
      ready_for_bidirectional_stock_sync: false,
    }, { headers: HEADERS });
  } catch {
    return Response.json({
      verified: false,
      read_only: true,
      error: "Audit des mouvements indisponible. Aucun stock n'a ete modifie.",
    }, { status: 502, headers: HEADERS });
  }
}
