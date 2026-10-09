import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";

const REALM = "9341458454408573";
const EVENT_KEY = "ENV-CN-SIM-RESTOCK-0001";
const FAKE_PRODUCT = "sandbox-inventory-demo-only";
const ROUTE = "/api/quickbooks/inventory-event-simulation";
const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

type Event = {
  id: string;
  product_id: string;
  region: string;
  environment: string;
  realm_id: string;
  origin: string;
  event_key: string;
  kind: string;
  stock_before: number | null;
  stock_after: number | null;
  quantity_change: number | null;
  state: string;
};

function page(inner: string, status = 200): Response {
  return new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Événement de stock fictif</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:720px;margin:50px auto;padding:0 20px;color:#203346}section{padding:20px;margin:20px 0;border:1px solid #cbd5e1;border-radius:12px}button{background:#06624b;color:white;border:none;padding:14px 18px;border-radius:8px;font:600 16px system-ui;cursor:pointer}a{color:#1568ab}</style></head><body><h1>Simulation d'un mouvement d'inventaire</h1><p>Test isolé en QuickBooks Sandbox. Aucun produit, commande, stock, facture ou paiement n'est modifié.</p><section><strong>Événement :</strong> Réapprovisionnement fictif Conakry<br><strong>Origine :</strong> CMS (simulation)<br><strong>Stock fictif avant :</strong> 2<br><strong>Stock fictif après :</strong> 3<br><strong>Variation fictive :</strong> +1<br><strong>Référence :</strong> ${EVENT_KEY}<br><strong>Destination :</strong> journal D1 seulement</section>${inner}<p><a href="/api/quickbooks/inventory-sync-audit">Consulter l'audit des mouvements</a></p></body></html>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", ...HEADERS },
  });
}

async function readEvent(): Promise<Event | null> {
  return cmsEnv().DB.prepare(
    "SELECT id,product_id,region,environment,realm_id,origin,event_key,kind," +
    "stock_before,stock_after,quantity_change,state FROM quickbooks_inventory_events " +
    "WHERE environment='sandbox' AND realm_id=? AND region='conakry' " +
    "AND origin='cms' AND event_key=?",
  ).bind(REALM, EVENT_KEY).first<Event>();
}

function matchesDemo(item: Event): boolean {
  return item.product_id === FAKE_PRODUCT && item.region === "conakry" &&
    item.environment === "sandbox" && item.realm_id === REALM &&
    item.origin === "cms" && item.event_key === EVENT_KEY &&
    item.kind === "restock" && item.stock_before === 2 &&
    item.stock_after === 3 && item.quantity_change === 1 &&
    item.state === "manual_review";
}

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const event = await readEvent();
  if (event && !matchesDemo(event)) {
    return page("<section>Conflit dans le registre. Aucune action autorisée.</section>", 409);
  }
  if (event) {
    return page("<section><strong>Événement fictif déjà enregistré une seule fois.</strong><br>" +
      "État : <strong>manual_review</strong><br>Stock CMS réel : inchangé<br>" +
      "Stock QuickBooks : inchangé<br>Synchronisation automatique : inactive</section>");
  }
  return page("<section>Le bouton enregistrera <strong>un seul événement fictif</strong> dans D1," +
    " à l'état <strong>manual_review</strong>. L'appuyer plusieurs fois ne créera pas de doublon." +
    "<form method='post' action='" + ROUTE + "'><input type='hidden' name='action' value='create-demo'>" +
    "<p><button type='submit'>Enregistrer le mouvement fictif +1</button></p></form></section>");
}

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const site = request.headers.get("Sec-Fetch-Site");
  const origin = request.headers.get("Origin");
  if (site !== "same-origin" ||
      (origin && origin !== "null" && origin !== new URL(request.url).origin)) {
    return page("<section>Origine de requête invalide.</section>", 403);
  }
  if (!(request.headers.get("Content-Type") || "").startsWith("application/x-www-form-urlencoded")) {
    return page("<section>Format invalide.</section>", 415);
  }
  const form = await request.formData();
  if (form.get("action") !== "create-demo") return page("<section>Action inconnue.</section>", 400);
  const existing = await readEvent();
  if (existing) {
    if (!matchesDemo(existing)) return page("<section>Conflit : aucune action effectuée.</section>", 409);
    return Response.redirect(new URL(ROUTE, request.url), 303);
  }
  const runtime = cmsEnv();
  if (runtime.QUICKBOOKS_MODE !== "sandbox") {
    return page("<section>Mode QuickBooks Sandbox requis.</section>", 409);
  }
  const connected = await runtime.DB.prepare(
    "SELECT realm_id FROM quickbooks_connections WHERE environment='sandbox'",
  ).first<{ realm_id: string }>();
  if (connected?.realm_id !== REALM) return page("<section>Sandbox inattendu.</section>", 409);

  const now = new Date().toISOString();
  await runtime.DB.prepare(
    "INSERT OR IGNORE INTO quickbooks_inventory_events " +
    "(id,product_id,region,environment,realm_id,origin,event_key,kind,stock_before," +
    "stock_after,quantity_change,source_revision,qbo_item_id,state,observed_at,updated_at) " +
    "VALUES (? ,?,'conakry','sandbox',?,'cms',?,'restock',2,3,1,'demo-v1',NULL," +
    "'manual_review',?,?)",
  ).bind(crypto.randomUUID(), FAKE_PRODUCT, REALM, EVENT_KEY, now, now).run();
  return Response.redirect(new URL(ROUTE, request.url), 303);
}
