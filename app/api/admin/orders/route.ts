import * as v from "valibot";

import { cmsEnv, currentAdmin, forbidden, numberValue, stringValue } from "@/lib/cms";
import { normalizeMarket } from "@/lib/markets";
import { optionalNumericInput, optionalTextInput, validateJsonBody } from "@/lib/api-validation";
import { buildStockRestoreStatements, parseRestockLines } from "@/lib/order-stock-restoration";

const orderSchema = v.looseObject({
  id: optionalTextInput,
  customer_name: optionalTextInput,
  customer_phone: optionalTextInput,
  product_name: optionalTextInput,
  quantity: optionalNumericInput,
  total: optionalNumericInput,
  status: optionalTextInput,
  notes: optionalTextInput,
  region: optionalTextInput,
  delivery_zone: optionalTextInput,
});

type StoredOrder = {
  id: string;
  status: string;
  region: string;
  items_json: string | null;
  [key: string]: unknown;
};

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const region = new URL(request.url).searchParams.get("region");
  const { results } = region === "all" || !region
    ? await cmsEnv().DB.prepare("SELECT * FROM orders ORDER BY created_at DESC").all()
    : await cmsEnv().DB.prepare("SELECT * FROM orders WHERE region=? ORDER BY created_at DESC")
      .bind(normalizeMarket(region)).all();
  return Response.json({ orders: results });
}

export async function POST(request: Request) {
  const admin = await currentAdmin(request);
  if (!admin) return forbidden();

  const parsed = await validateJsonBody(request, orderSchema);
  if (!parsed.success) return parsed.response;
  const data = parsed.data;
  const id = stringValue(data.id) || crypto.randomUUID();
  const now = new Date().toISOString();
  const requestedRegion = normalizeMarket(data.region);
  const statuses = new Set(["new", "confirmed", "preparing", "ready", "delivered", "cancelled"]);
  const status = statuses.has(stringValue(data.status)) ? stringValue(data.status) : "new";
  const db = cmsEnv().DB;
  const existing = await db.prepare("SELECT id,status,region,items_json FROM orders WHERE id=?")
    .bind(id).first<StoredOrder>();

  if (!existing) {
    await db.prepare(
      "INSERT INTO orders " +
      "(id,customer_name,customer_phone,product_name,quantity,total,status,notes,region,currency," +
      "delivery_zone,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(
      id, stringValue(data.customer_name), stringValue(data.customer_phone),
      stringValue(data.product_name), numberValue(data.quantity, 1),
      numberValue(data.total), status, stringValue(data.notes), requestedRegion,
      requestedRegion === "qc" ? "CAD" : "GNF",
      stringValue(data.delivery_zone) || null, now, now,
    ).run();
    return Response.json({ id });
  }

  const beforeStatus = stringValue(existing.status);
  // Once an order has entered preparation, it may already be packed or shipped.
  // Never return its items to sellable stock merely by changing its status.
  if (status === "cancelled" &&
      beforeStatus !== "cancelled" &&
      !["new", "confirmed"].includes(beforeStatus)) {
    return Response.json({
      error: "Cette commande a déjà commencé la préparation ou la livraison. Le retour doit être inspecté avant toute remise en stock.",
      code: "RETURN_INSPECTION_REQUIRED",
    }, { status: 409 });
  }
  if (beforeStatus === "cancelled" && status !== "cancelled") {
    return Response.json({
      error: "Une commande annulée ne peut pas être réactivée directement : le stock a déjà été restitué. Créez une nouvelle commande.",
    }, { status: 409 });
  }
  const storedRegion = normalizeMarket(existing.region);
  let statements: D1PreparedStatement[] = [];
  if (beforeStatus !== "cancelled" && status === "cancelled") {
    try {
      const lines = parseRestockLines(existing.items_json);
      statements = await buildStockRestoreStatements({
        db, order: {
          id, status: beforeStatus, region: storedRegion,
          items_json: existing.items_json,
        }, lines, now, adminId: admin.id,
      });
    } catch (error) {
      return Response.json({
        error: error instanceof Error ? error.message : "Impossible de restaurer le stock.",
      }, { status: 409 });
    }
  }

  // Compare-and-swap protects against two admins cancelling the same order.
  // All restocks, review-only events and order status change are one D1 batch.
  statements.push(db.prepare(
    "UPDATE orders SET customer_name=?,customer_phone=?,product_name=?,quantity=?,total=?," +
    "status=?,notes=?,region=?,currency=?,delivery_zone=?,updated_at=? " +
    "WHERE id=? AND status=?"
  ).bind(
    stringValue(data.customer_name), stringValue(data.customer_phone),
    stringValue(data.product_name), numberValue(data.quantity, 1),
    numberValue(data.total), status, stringValue(data.notes), storedRegion,
    storedRegion === "qc" ? "CAD" : "GNF",
    stringValue(data.delivery_zone) || null, now, id, beforeStatus,
  ));
  try {
    const results = await db.batch(statements);
    if (Number(results[results.length - 1]?.meta?.changes || 0) !== 1) {
      return Response.json({
        error: "Cette commande a été modifiée simultanément. Rechargez le CMS avant de réessayer.",
      }, { status: 409 });
    }
  } catch (error) {
    console.error("Order update or stock restore transaction failed", error);
    return Response.json({ error: "Enregistrement impossible, réessayez après vérification." }, { status: 500 });
  }
  return Response.json({ id });
}

export async function DELETE(request: Request) {
  const admin = await currentAdmin(request);
  if (!admin) return forbidden();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Commande invalide." }, { status: 400 });
  const db = cmsEnv().DB;
  const order = await db.prepare("SELECT * FROM orders WHERE id=?")
    .bind(id).first<StoredOrder>();
  if (!order) return Response.json({ error: "Commande introuvable." }, { status: 404 });

  const now = new Date().toISOString();
  const status = stringValue(order.status);
  // Deletion must never silently put delivered, ready or prepared goods back
  // on sale. Only unfulfilled orders can use the direct cancellation path.
  if (!["new", "confirmed", "cancelled"].includes(status)) {
    return Response.json({
      error: "Commande en préparation, prête ou livrée : traitement de retour et inspection obligatoire avant suppression.",
      code: "RETURN_INSPECTION_REQUIRED",
    }, { status: 409 });
  }
  let statements: D1PreparedStatement[] = [];
  if (status !== "cancelled") {
    try {
      const lines = parseRestockLines(order.items_json);
      statements = await buildStockRestoreStatements({
        db, order: {
          id, status, region: normalizeMarket(order.region),
          items_json: order.items_json,
        }, lines, now, adminId: admin.id,
      });
    } catch (error) {
      return Response.json({
        error: error instanceof Error ? error.message : "Impossible de restaurer le stock.",
      }, { status: 409 });
    }
  }

  // The undo snapshot, the restock and the DELETE share the same transaction.
  // The status guard prevents both duplicate restorations and duplicate undo
  // entries if another administrator has already changed the order.
  const undoKey = `cms_undo:${Date.now()}:${crypto.randomUUID()}`;
  statements.push(db.prepare(
    "INSERT INTO settings (key,value,updated_at) " +
    "SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM orders WHERE id=? AND status=?)"
  ).bind(
    undoKey,
    JSON.stringify({
      type: "order_delete", table: "orders",
      label: `Suppression commande · ${String(order.id)}`,
      before: order,
    }),
    now, id, status,
  ));
  statements.push(db.prepare("DELETE FROM orders WHERE id=? AND status=?").bind(id, status));
  try {
    const result = await db.batch(statements);
    const deleteResult = result[result.length - 1];
    if (Number(deleteResult?.meta?.changes || 0) !== 1) {
      return Response.json({
        error: "Commande déjà modifiée ou supprimée. Rechargez le CMS.",
      }, { status: 409 });
    }
  } catch (error) {
    console.error("Order deletion and stock restore transaction failed", error);
    return Response.json({ error: "Suppression impossible, aucun stock ne doit être ajusté manuellement sans vérification." },
      { status: 500 });
  }
  return Response.json({ ok: true });
}
