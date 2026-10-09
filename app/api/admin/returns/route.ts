import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { normalizeMarket } from "@/lib/markets";
import { parseRestockLines } from "@/lib/order-stock-restoration";
import { eligibleDeliveredOrder, validReturnQuantity, canApproveReturnForResale, canRejectReturnAsNonResellable } from "@/lib/return-inspection-policy";

type ReturnInput = {
  order_id?: unknown;
  product_id?: unknown;
  quantity?: unknown;
  request_key?: unknown;
  notes?: unknown;
  id?: unknown;
  decision?: unknown;
  unused_confirmed?: unknown;
  undamaged_confirmed?: unknown;
  packaging_intact_confirmed?: unknown;
};

const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const errorResponse = (error: string, status = 400) =>
  Response.json({ error }, { status, headers: HEADERS });

function safeWriteRequest(request: Request): boolean {
  const origin = request.headers.get("Origin");
  const site = request.headers.get("Sec-Fetch-Site");
  return (site === "same-origin" || (!site && origin === new URL(request.url).origin)) &&
    (!origin || origin === new URL(request.url).origin) &&
    (request.headers.get("Content-Type") || "").startsWith("application/json");
}

async function parseBody(request: Request): Promise<ReturnInput | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body as ReturnInput : null;
  } catch { return null; }
}

// No stock, invoice, or payment writes exist in these methods.
export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const region = normalizeMarket(new URL(request.url).searchParams.get("region"));
  try {
    const { results } = await cmsEnv().DB.prepare(
      "SELECT r.id,r.order_id,r.product_id,r.request_key,r.region,r.quantity," +
      "r.inspection_state,r.unused_confirmed,r.undamaged_confirmed," +
      "r.packaging_intact_confirmed,r.inspected_at,r.inspection_notes," +
      "r.stock_posted,r.refund_state,r.created_at,p.stock_qc,p.stock_conakry," +
      "p.name_fr AS product_name,p.article_number,o.customer_name " +
      "FROM order_returns r LEFT JOIN products p ON p.id=r.product_id " +
      "LEFT JOIN orders o ON o.id=r.order_id " +
      "WHERE r.region=? ORDER BY r.created_at DESC LIMIT 100",
    ).bind(region).all();
    return Response.json({ region, returns: results, automatic_restock_enabled: false, manual_release_requires_confirmation: true, quickbooks_refunds_enabled: false }, { headers: HEADERS });
  } catch {
    return errorResponse("Liste des retours indisponible. Vérifie la migration 0021.", 503);
  }
}

// Register an item physically returned by the customer. Quarantine is mandatory.
export async function POST(request: Request) {
  const admin = await currentAdmin(request);
  if (!admin) return forbidden();
  if (!safeWriteRequest(request)) return errorResponse("Origine de requête invalide.", 403);
  const body = await parseBody(request);
  if (!body) return errorResponse("Données manquantes.");
  const orderId = typeof body.order_id === "string" ? body.order_id.trim() : "";
  const productId = typeof body.product_id === "string" ? body.product_id.trim() : "";
  const requestKey = typeof body.request_key === "string" ? body.request_key : "";
  const quantity = body.quantity;
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
  if (!orderId || !productId || !/^[0-9a-f-]{36}$/i.test(requestKey) ||
      !Number.isSafeInteger(quantity) || Number(quantity) < 1 || Number(quantity) > 99) {
    return errorResponse("Numéro de commande, produit, quantité ou référence invalide.");
  }

  const db = cmsEnv().DB;
  try {
    const existing = await db.prepare(
      "SELECT id,order_id,product_id,quantity FROM order_returns WHERE order_id=? AND product_id=? AND request_key=?",
    ).bind(orderId, productId, requestKey).first<{
      id: string; order_id: string; product_id: string; quantity: number;
    }>();
    if (existing) {
      return existing.quantity === quantity
        ? Response.json({ id: existing.id, already_recorded: true, stock_modified: false }, { headers: HEADERS })
        : errorResponse("Une autre quantité existe déjà pour cette référence.", 409);
    }

    const order = await db.prepare("SELECT id,status,region,items_json FROM orders WHERE id=?")
      .bind(orderId).first<{ id: string; status: string; region: string; items_json: string | null }>();
    if (!order || !eligibleDeliveredOrder(order.status)) {
      return errorResponse("Seules les commandes livrées peuvent être enregistrées comme retours. Les autres relèvent de l'annulation.", 409);
    }
    if (order.region !== "qc" && order.region !== "conakry") return errorResponse("Boutique inconnue.", 409);
    const lines = parseRestockLines(order.items_json);
    const orderedQuantity = lines.find((line) => line.product_id === productId)?.quantity || 0;
    if (!validReturnQuantity(quantity, orderedQuantity, 0)) {
      return errorResponse("Le produit ou la quantité ne correspond pas à la commande.", 409);
    }
    const product = await db.prepare("SELECT id FROM products WHERE id=?")
      .bind(productId).first<{ id: string }>();
    if (!product) return errorResponse("Produit supprimé : intervention manuelle nécessaire.", 409);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const result = await db.prepare(
      "INSERT INTO order_returns " +
      "(id,order_id,product_id,request_key,region,quantity,inspection_state,inspection_notes,created_by,created_at,updated_at) " +
      "SELECT ?,?,?,?,?,?,'awaiting_inspection',?,?,?,? " +
      "WHERE EXISTS(SELECT 1 FROM orders WHERE id=? AND status='delivered') " +
      "AND (SELECT COALESCE(SUM(quantity),0) FROM order_returns " +
      "WHERE order_id=? AND product_id=?) + ? <= ?",
    ).bind(
      id, orderId, productId, requestKey, order.region, Number(quantity),
      notes, admin.id, now, now, orderId,
      orderId, productId, Number(quantity), orderedQuantity,
    ).run();
    if (Number(result.meta?.changes || 0) !== 1) {
      return errorResponse("Quantité de retours déjà enregistrée ou commande modifiée. Recharge le suivi.", 409);
    }
    return Response.json({
      id, region: order.region, inspection_state: "awaiting_inspection",
      stock_modified: false, qbo_modified: false, refund_modified: false,
    }, { status: 201, headers: HEADERS });
  } catch {
    return errorResponse("Retour non enregistré. Vérifie la migration et réessaie sans créer de doublon.", 500);
  }
}

// Record inspection only. Stock release and QuickBooks adjustments deliberately
// require a separate future operation after sandbox reconciliation.
export async function PATCH(request: Request) {
  const admin = await currentAdmin(request);
  if (!admin) return forbidden();
  if (!safeWriteRequest(request)) return errorResponse("Origine de requête invalide.", 403);
  const body = await parseBody(request);
  if (!body || typeof body.id !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(body.id) ||
      !["approve", "reject", "quarantine"].includes(String(body.decision))) {
    return errorResponse("Inspection invalide.");
  }
  const approval = body.decision === "approve";
  const rejection = body.decision === "reject";
  const unused = body.unused_confirmed === true;
  const undamaged = body.undamaged_confirmed === true;
  const packaging = body.packaging_intact_confirmed === true;
  const note = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
  if (approval && !canApproveReturnForResale({unused_confirmed: unused, undamaged_confirmed: undamaged, packaging_intact_confirmed: packaging})) {
    return errorResponse("La revente n'est possible que si le jouet est neuf, intact et que son emballage est conforme.");
  }
  if (rejection && !canRejectReturnAsNonResellable(note)) {
    return errorResponse("Précise pourquoi le jouet ne peut pas être revendu.");
  }
  const next = approval ? "approved_for_resale" : rejection ? "not_resellable" : "quarantined";
  const now = new Date().toISOString();
  const db = cmsEnv().DB;
  try {
    const result = await db.prepare(
      "UPDATE order_returns SET inspection_state=?,unused_confirmed=?," +
      "undamaged_confirmed=?,packaging_intact_confirmed=?,inspected_by=?," +
      "inspected_at=?,inspection_notes=?,updated_at=? " +
      "WHERE id=? AND stock_posted=0 AND " +
      "(inspection_state IN ('awaiting_inspection','quarantined') OR " +
      "(inspection_state='approved_for_resale' AND ? IN ('reject','quarantine')))",
    ).bind(next, unused ? 1 : 0, undamaged ? 1 : 0, packaging ? 1 : 0,
      admin.id, now, note || null, now, body.id, String(body.decision)).run();
    if (Number(result.meta?.changes || 0) !== 1) {
      return errorResponse("Retour déjà traité ou modifié simultanément. Actualise la page.", 409);
    }
    return Response.json({
      id: body.id, inspection_state: next, stock_posted: false,
      quickbooks_modified: false, refund_modified: false,
      message: approval
        ? "Revente approuvée. Le stock disponible n'a pas encore été augmenté."
        : rejection ? "Produit classé non revendable, stock inchangé."
          : "Produit maintenu en quarantaine, stock inchangé.",
    }, { headers: HEADERS });
  } catch {
    return errorResponse("Inspection non enregistrée. Aucun stock modifié.", 500);
  }
}
