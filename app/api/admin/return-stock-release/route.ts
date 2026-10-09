import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { previewReturnedItemRelease } from "@/lib/return-stock-release-policy";

const SANDBOX_REALM = "9341458454408573";
const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
type ReleaseBody = {
  id?: unknown;
  product_id?: unknown;
  region?: unknown;
  quantity?: unknown;
  expected_stock?: unknown;
  confirm_release?: unknown;
};
type ReturnRow = {
  id: string;
  product_id: string;
  region: "qc" | "conakry";
  quantity: number;
  inspection_state: string;
  unused_confirmed: number;
  undamaged_confirmed: number;
  packaging_intact_confirmed: number;
  inspected_by: string | null;
  inspected_at: string | null;
  stock_posted: number;
  stock_qc: number | null;
  stock_conakry: number | null;
  mapped_product_id: string | null;
};

const error = (message: string, status = 409) =>
  Response.json({ error: message }, { status, headers: HEADERS });

/**
 * Explicit, authenticated, same-origin SECOND approval to release a returned
 * item into CMS sellable stock. No refund, QBO write or invoice change.
 *
 * All writes are in one transactional D1 batch. The first INSERT is permitted
 * only while this specific approved return is not yet marked stock_posted.
 * Consequently retries / concurrent calls cannot add the same units twice.
 */
export async function POST(request: Request) {
  const admin = await currentAdmin(request);
  if (!admin) return forbidden();
  const origin = request.headers.get("Origin");
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  const allowedOrigin = new URL(request.url).origin;
  if ((origin && origin !== allowedOrigin) ||
      !(fetchSite === "same-origin" || (!fetchSite && origin === allowedOrigin)) ||
      !(request.headers.get("Content-Type") || "").startsWith("application/json")) {
    return error("Requête de confirmation invalide.", 403);
  }

  let payload: ReleaseBody;
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) return error("Données invalides.", 400);
    payload = value as ReleaseBody;
  } catch {
    return error("Données invalides.", 400);
  }

  if (payload.confirm_release !== true ||
      typeof payload.id !== "string" || !/^[0-9a-f-]{36}$/i.test(payload.id) ||
      typeof payload.product_id !== "string" || !payload.product_id.trim() ||
      (payload.region !== "qc" && payload.region !== "conakry") ||
      !Number.isSafeInteger(payload.quantity) || Number(payload.quantity) <= 0 ||
      Number(payload.quantity) > 99 ||
      !Number.isSafeInteger(payload.expected_stock) || Number(payload.expected_stock) < 0) {
    return error("La confirmation explicite, le produit et la quantité sont requis.", 400);
  }

  const runtime = cmsEnv();
  const db = runtime.DB;
  const returnId = payload.id;
  const region = payload.region;
  const productId = payload.product_id;
  const quantity = Number(payload.quantity);
  const expectedStock = Number(payload.expected_stock);
  const column = region === "qc" ? "stock_qc" : "stock_conakry";

  try {
    const row = await db.prepare(
      "SELECT r.id,r.region,r.product_id,r.quantity,r.inspection_state," +
      "r.unused_confirmed,r.undamaged_confirmed,r.packaging_intact_confirmed," +
      "r.inspected_by,r.inspected_at,r.stock_posted," +
      "p.id AS mapped_product_id,p.stock_qc,p.stock_conakry " +
      "FROM order_returns r LEFT JOIN products p ON p.id=r.product_id WHERE r.id=?"
    ).bind(returnId).first<ReturnRow>();

    if (!row || row.region !== region || row.product_id !== productId ||
        row.quantity !== quantity) {
      return error("Le retour a changé ou n'existe plus. Actualise la page.");
    }
    const before = row.region === "qc" ? row.stock_qc : row.stock_conakry;
    const check = previewReturnedItemRelease({
      ...row,
      product_exists: Boolean(row.mapped_product_id),
      current_stock: before,
    }, true);
    if (!check.eligible || before !== expectedStock) {
      return error("Remise en stock refusée : inspection ou inventaire modifié. Actualise et vérifie le retour.");
    }

    // In audit mode the journal is required for an atomic inventory release:
    // never silently skip a ledger entry when the configured sandbox is wrong.
    const captureSandbox = runtime.QUICKBOOKS_MODE === "sandbox" &&
      runtime.QUICKBOOKS_INVENTORY_AUDIT_MODE === "sandbox_capture";
    if (captureSandbox) {
      const connection = await db.prepare(
        "SELECT realm_id FROM quickbooks_connections WHERE environment='sandbox'"
      ).first<{ realm_id: string }>();
      if (connection?.realm_id !== SANDBOX_REALM) {
        return error("Journal Sandbox QuickBooks non disponible. Stock inchangé.");
      }
    }

    const now = new Date().toISOString();
    const movementId = crypto.randomUUID();

    // The INSERT succeeds at most once per returned item: r.stock_posted
    // changes to 1 in the same D1 transaction as the inventory update.
    // Stock snapshot must still equal the value the admin confirmed.
    const guard =
      "r.id=? AND r.region=? AND r.product_id=? AND r.quantity=? " +
      "AND r.stock_posted=0 AND r.inspection_state='approved_for_resale' " +
      "AND r.unused_confirmed=1 AND r.undamaged_confirmed=1 " +
      "AND r.packaging_intact_confirmed=1 " +
      "AND r.inspected_by IS NOT NULL AND length(trim(r.inspected_by))>0 " +
      "AND r.inspected_at IS NOT NULL AND length(trim(r.inspected_at))>0 " +
      `AND typeof(p.${column}) IN ('integer','real') ` +
      `AND p.${column} >= 0 AND p.${column}=? ` +
      `AND p.${column} + r.quantity <= 9007199254740991`;

    const writes: D1PreparedStatement[] = [
      db.prepare(
        "INSERT INTO stock_movements " +
        "(id,product_id,region,previous_stock,new_stock,delta,reason,admin_id,created_at) " +
        `SELECT ?,p.id,r.region,p.${column},p.${column}+r.quantity,r.quantity,?,?,? ` +
        "FROM order_returns r JOIN products p ON p.id=r.product_id WHERE " + guard,
      ).bind(
        movementId, "Retour inspecté neuf et remis en stock · " + returnId,
        admin.id, now, returnId, region, productId, quantity, expectedStock,
      ),
      db.prepare(
        region === "qc"
          ? "UPDATE products SET stock_qc=stock_qc+?,updated_at=? " +
            "WHERE id=? AND EXISTS (SELECT 1 FROM stock_movements WHERE id=? AND product_id=?)"
          : "UPDATE products SET stock_conakry=stock_conakry+?,stock=stock_conakry+?," +
            "updated_at=? WHERE id=? " +
            "AND EXISTS (SELECT 1 FROM stock_movements WHERE id=? AND product_id=?)",
      ).bind(...(region === "qc"
        ? [quantity, now, productId, movementId, productId]
        : [quantity, quantity, now, productId, movementId, productId])),
      db.prepare(
        "UPDATE order_returns SET stock_posted=1,stock_posted_at=?,updated_at=? " +
        "WHERE id=? AND stock_posted=0 AND inspection_state='approved_for_resale' " +
        "AND EXISTS (SELECT 1 FROM stock_movements WHERE id=? AND product_id=?)",
      ).bind(now, now, returnId, movementId, productId),
    ];

    if (captureSandbox) {
      // Guaranteed review-only; no outgoing QuickBooks adjustment.
      writes.push(db.prepare(
        "INSERT INTO quickbooks_inventory_events " +
        "(id,product_id,region,environment,realm_id,origin,event_key,kind," +
        "stock_before,stock_after,quantity_change,source_revision,qbo_item_id," +
        "state,observed_at,updated_at) " +
        "SELECT ?,product_id,region,'sandbox',?,'cms',?,'return'," +
        "previous_stock,new_stock,delta,?,NULL,'manual_review',?,? " +
        "FROM stock_movements WHERE id=?",
      ).bind(
        crypto.randomUUID(), SANDBOX_REALM,
        "return_release:" + returnId, returnId, now, now, movementId,
      ));
    }

    const results = await db.batch(writes);
    const changes = results.slice(0, 3).map((item) => Number(item.meta?.changes || 0));
    if (changes[0] === 0 && changes[1] === 0 && changes[2] === 0) {
      return error("Ce retour a déjà été traité ou le stock a changé. Aucune nouvelle remise en stock.");
    }
    if (!changes.every((count) => count === 1) ||
        (captureSandbox && Number(results[3]?.meta?.changes || 0) !== 1)) {
      console.error("Unexpected return stock release batch counts", { returnId, changes });
      return error("État d'inventaire à vérifier manuellement avant toute nouvelle action.", 500);
    }

    return Response.json({
      success: true,
      return_id: returnId,
      region,
      quantity_added: quantity,
      stock_before: expectedStock,
      stock_after: expectedStock + quantity,
      stock_posted: true,
      quickbooks_adjustment_created: false,
      refund_issued: false,
      sandbox_event_review_only: captureSandbox,
    }, { headers: HEADERS });
  } catch (failure) {
    console.error("Return stock release failed", failure);
    return error("La remise en stock n'a pas pu être confirmée. Actualise le registre avant de réessayer.", 500);
  }
}
