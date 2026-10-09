import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";

const REALM = "9341458454408573";
const ORDER_ID = "00000000-0000-4000-8000-000000000048";
const DOC = "ENVQ-SIM-PEND-0001";
const ROUTE = "/api/quickbooks/queue-pending-simulation";
const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

function html(text: string, status = 200): Response {
  return new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>File QuickBooks Sandbox</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:680px;margin:46px auto;padding:0 20px;color:#253344}section{border:1px solid #cbd5e1;padding:20px;border-radius:12px;margin:20px 0}button{font:600 16px system-ui;border:0;border-radius:9px;background:#075e49;color:white;padding:12px 16px;cursor:pointer}small{color:#536374}.warning{border-left:4px solid #b17b16;padding-left:12px}</style></head><body>${text}</body></html>`, {
    status, headers: { "Content-Type": "text/html; charset=utf-8", ...HEADERS },
  });
}

type DemoRecord = {
  source: string; region: string; currency: string; environment: string;
  realm_id: string; doc_number: string; state: string; order_snapshot_json: string;
  qbo_invoice_id: string | null;
};
async function readDemo(): Promise<DemoRecord | null> {
  return cmsEnv().DB.prepare(
    "SELECT source,region,currency,environment,realm_id,doc_number,state," +
    "order_snapshot_json,qbo_invoice_id FROM quickbooks_order_sync WHERE order_id=?",
  ).bind(ORDER_ID).first<DemoRecord>();
}
function isDemo(row: DemoRecord): boolean {
  try {
    const data = JSON.parse(row.order_snapshot_json) as { is_simulation?: boolean };
    return data.is_simulation === true && row.source === "admin" &&
      row.region === "qc" && row.currency === "CAD" && row.environment === "sandbox" &&
      row.realm_id === REALM && row.doc_number === DOC && row.qbo_invoice_id === null;
  } catch { return false; }
}

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const row = await readDemo();
  const intro = '<h1>Test de la file d’attente QuickBooks</h1>' +
    '<p>Simulation isolée du panier public. Aucune facture QuickBooks n’est créée.</p>' +
    '<section><strong>Commande :</strong> Simulation Québec<br>' +
    '<strong>Montant :</strong> 25,00 $ CAD<br><strong>Numéro :</strong> ' + DOC + '<br>' +
    '<strong>Entreprise :</strong> Sandbox Company CA 2d21<br>' +
    '<strong>Source :</strong> admin, simulation seulement<br>' +
    '<strong>Stock et courriel :</strong> inchangés<br>' +
    '<strong>Facture :</strong> aucune</section>';
  if (row && !isDemo(row)) {
    return html(intro + '<section class="warning">Entrée inattendue. Aucune action permise.</section>', 409);
  }
  if (!row) {
    return html(intro + '<section><p class="warning">Le bouton écrira UNE entrée fictive avec l’état <strong>pending</strong> dans D1. La synchronisation et les factures restent désactivées.</p>' +
      '<form method="post" action="' + ROUTE + '">' +
      '<input type="hidden" name="action" value="create-pending">' +
      '<button type="submit">Enregistrer le test en attente</button></form></section>');
  }
  if (row.state === "pending") {
    return html(intro + '<section><strong>Enregistrée dans D1 :</strong> pending<br>' +
      '<strong>Facture QuickBooks :</strong> aucune<br><small>Après avoir vérifié les statistiques, clôture ce test pour qu’il ne reste pas en attente.</small></section>' +
      '<form method="post" action="' + ROUTE + '">' +
      '<input type="hidden" name="action" value="close-demo">' +
      '<button type="submit">Clôturer le test sans facturer</button></form>' +
      '<p><a href="/api/quickbooks/order-sync-status">Voir les statistiques</a></p>');
  }
  return html(intro + '<section><strong>Simulation clôturée :</strong> ' +
    (row.state === "manual_review" ? "manual_review" : "vérification nécessaire") +
    '<br>Facture QuickBooks : aucune</section>');
}

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const site = request.headers.get("Sec-Fetch-Site");
  const origin = request.headers.get("Origin");
  if (site !== "same-origin" ||
      (origin && origin !== "null" && origin !== new URL(request.url).origin)) {
    return html("<h1>Requête externe refusée.</h1>", 403);
  }
  if (!(request.headers.get("Content-Type") ?? "").startsWith("application/x-www-form-urlencoded")) {
    return html("<h1>Format de formulaire invalide.</h1>", 415);
  }
  const form = await request.formData();
  const action = form.get("action");
  const db = cmsEnv().DB;
  const existing = await readDemo();
  if (existing && !isDemo(existing)) return html("<h1>Entrée inattendue. Aucune action.</h1>", 409);
  const now = new Date().toISOString();

  if (action === "close-demo") {
    if (existing?.state === "pending") {
      await db.prepare(
        "UPDATE quickbooks_order_sync SET state='manual_review',updated_at=? " +
        "WHERE order_id=? AND source='admin' AND state='pending' AND qbo_invoice_id IS NULL",
      ).bind(now, ORDER_ID).run();
    }
    return Response.redirect(new URL(ROUTE, request.url), 303);
  }
  if (action !== "create-pending") return html("<h1>Action inconnue.</h1>", 400);
  if (existing) return Response.redirect(new URL(ROUTE, request.url), 303);

  if (cmsEnv().QUICKBOOKS_MODE !== "sandbox") {
    return html("<h1>Mode QuickBooks Sandbox requis.</h1>", 409);
  }
  const connection = await db.prepare(
    "SELECT realm_id FROM quickbooks_connections WHERE environment='sandbox'",
  ).first<{ realm_id: string }>();
  if (connection?.realm_id !== REALM) {
    return html("<h1>Entreprise Sandbox inattendue.</h1>", 409);
  }
  const snapshot = {
    id: ORDER_ID, is_simulation: true, region: "qc", currency: "CAD",
    customer_name: "TEST Envol Québec", customer_phone: "0000000000",
    customer_email: null, delivery_address: "Adresse fictive",
    items: [{ product_id: "simulation-only", article_number: "TEST-QC-02",
      name: "Jouet fictif", quantity: 1, unit_price: 25, line_total: 25 }],
    total: 25, created_at: now,
  };
  await db.prepare(
    "INSERT OR IGNORE INTO quickbooks_order_sync (" +
    "order_id,source,region,currency,environment,realm_id,doc_number," +
    "order_snapshot_json,state,created_at,updated_at) " +
    "VALUES (?,'admin','qc','CAD','sandbox',?,?,?,'pending',?,?)",
  ).bind(ORDER_ID, REALM, DOC, JSON.stringify(snapshot), now, now).run();
  return Response.redirect(new URL(ROUTE, request.url), 303);
}
