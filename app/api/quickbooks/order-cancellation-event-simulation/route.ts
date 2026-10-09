import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { captureSandboxOrderCancellationRestock } from "@/lib/quickbooks-inventory-capture";

const REALM = "9341458454408573";
const FAKE_ORDER = "00000000-0000-4000-8000-000000000099";
const FAKE_PRODUCT = "sandbox-checkout-sale-demo-only";
const EVENT_KEY = "order_cancel:" + FAKE_ORDER + ":" + FAKE_PRODUCT;
const ROUTE = "/api/quickbooks/order-cancellation-event-simulation";
const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

type DemoEvent = {
  product_id: string;
  kind: string;
  state: string;
  quantity_change: number;
  origin: string;
  event_key: string;
};

function page(content: string, status = 200): Response {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Annulation fictive - Inventaire</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:730px;margin:50px auto;padding:0 20px;color:#203346}section{padding:20px;margin:20px 0;border:1px solid #cbd5e1;border-radius:12px}button{background:#076149;color:#fff;border:0;border-radius:8px;padding:13px 18px;font:600 16px system-ui;cursor:pointer}a{color:#1467ae}</style></head><body><h1>Test d'annulation dans le journal d'inventaire</h1><p>Simulation isolée. Aucune commande n'est annulée, aucun stock n'est modifié et aucune facture QuickBooks n'est touchée.</p><section><strong>Boutique :</strong> Conakry<br><strong>Commande :</strong> identifiant fictif<br><strong>Annulation :</strong> une unité fictive<br><strong>Mouvement à enregistrer :</strong> +1<br><strong>État :</strong> manual_review<br><strong>Destination :</strong> registre D1 seulement</section>${content}<p><a href="/api/quickbooks/inventory-sync-audit">Voir l'audit des inventaires</a></p></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", ...HEADERS } });
}

async function readDemo(): Promise<DemoEvent | null> {
  return cmsEnv().DB.prepare(
    "SELECT product_id,kind,state,quantity_change,origin,event_key FROM quickbooks_inventory_events " +
    "WHERE environment='sandbox' AND realm_id=? AND region='conakry' AND origin='cms' AND event_key=?",
  ).bind(REALM, EVENT_KEY).first<DemoEvent>();
}

function expected(item: DemoEvent): boolean {
  return item.product_id === FAKE_PRODUCT &&
    item.origin === "cms" && item.kind === "cancellation" &&
    item.state === "manual_review" && item.quantity_change === 1 &&
    item.event_key === EVENT_KEY;
}

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const existing = await readDemo();
  if (existing && !expected(existing)) {
    return page("<section>Entrée inattendue. Aucune action autorisée.</section>", 409);
  }
  if (existing) {
    return page("<section><strong>Annulation fictive enregistrée une seule fois.</strong><br>" +
      "État : manual_review<br>Mouvement de retour : +1<br>" +
      "Stock CMS réel : inchangé<br>Stock QuickBooks : inchangé<br>" +
      "Facture : inchangée</section>");
  }
  return page("<section>Le bouton créera <strong>un seul événement fictif +1</strong> dans D1, sans annuler de commande." +
    "<form method='post' action='" + ROUTE + "'><input type='hidden' name='action' value='record-demo'>" +
    "<p><button type='submit'>Enregistrer une annulation fictive +1</button></p></form></section>");
}

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const site = request.headers.get("Sec-Fetch-Site");
  const origin = request.headers.get("Origin");
  if (site !== "same-origin" ||
      (origin && origin !== "null" && origin !== new URL(request.url).origin)) {
    return page("<section>Origine de requête refusée.</section>", 403);
  }
  if (!(request.headers.get("Content-Type") ?? "").startsWith("application/x-www-form-urlencoded")) {
    return page("<section>Format de formulaire invalide.</section>", 415);
  }
  const form = await request.formData();
  if (form.get("action") !== "record-demo") return page("<section>Action inconnue.</section>", 400);
  const existing = await readDemo();
  if (existing) {
    return expected(existing)
      ? Response.redirect(new URL(ROUTE, request.url), 303)
      : page("<section>Conflit d'événement. Test annulé.</section>", 409);
  }
  const runtime = cmsEnv();
  if (runtime.QUICKBOOKS_MODE !== "sandbox" ||
      runtime.QUICKBOOKS_INVENTORY_AUDIT_MODE !== "sandbox_capture") {
    return page("<section>Capture Sandbox désactivée.</section>", 409);
  }
  try {
    await captureSandboxOrderCancellationRestock({
      id: FAKE_ORDER, region: "conakry",
      items: [{ product_id: FAKE_PRODUCT, quantity: 1 }],
    });
  } catch {
    return page("<section>Simulation indisponible. Aucun stock modifié.</section>", 502);
  }
  return Response.redirect(new URL(ROUTE, request.url), 303);
}
