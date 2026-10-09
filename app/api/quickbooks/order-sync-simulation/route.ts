import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";

const REALM = "9341458454408573";
const TEST_ORDER = "00000000-0000-4000-8000-000000000047";
const DOC = "ENVQ-SIM-0001";
const PATH = "/api/quickbooks/order-sync-simulation";

function page(body: string, status = 200) {
  return new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Simulation QuickBooks</title><style>body{font:16px/1.55 system-ui,sans-serif;max-width:680px;margin:48px auto;padding:0 20px;color:#243241}section{padding:20px;border:1px solid #cbd5e1;border-radius:12px;margin:22px 0}button{background:#12654e;color:white;border:0;border-radius:8px;padding:12px 18px;font:600 16px system-ui;cursor:pointer}.warning{border-left:4px solid #ac7a1b;padding-left:10px}</style></head><body>${body}</body></html>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}

async function readSimulation() {
  return cmsEnv().DB.prepare(
    "SELECT order_id,source,region,currency,environment,realm_id,doc_number,state,qbo_invoice_id FROM quickbooks_order_sync WHERE order_id=?",
  ).bind(TEST_ORDER).first<{
    order_id: string; source: string; region: string; currency: string; environment: string;
    realm_id: string; doc_number: string; state: string; qbo_invoice_id: string | null;
  }>();
}

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const existing = await readSimulation();
  const intro = "<h1>Simulation d'une commande Québec</h1>" +
    "<p>La simulation n'utilise pas le panier public et ne modifie aucune commande existante.</p>" +
    "<section><strong>Commande :</strong> TEST Québec — 1 jouet fictif<br>" +
    "<strong>Montant :</strong> 25,00 $ CAD<br><strong>Entreprise :</strong> QuickBooks Sandbox CA 2d21<br>" +
    "<strong>Numéro réservé :</strong> ENVQ-SIM-0001<br>" +
    "<strong>Stock :</strong> aucun changement<br><strong>Courriel :</strong> aucun<br>" +
    "<strong>Facture :</strong> aucune — test du registre seulement</section>";
  if (existing) {
    const valid = existing.source === "admin" && existing.region === "qc" &&
      existing.currency === "CAD" && existing.environment === "sandbox" &&
      existing.realm_id === REALM && existing.doc_number === DOC &&
      existing.state === "manual_review" && existing.qbo_invoice_id === null;
    return page(intro + (valid
      ? '<section><strong>Simulation enregistrée dans D1.</strong><br>Statut : manual_review<br>Facture QuickBooks : aucune</section>'
      : '<section class="warning">Une entrée inattendue existe déjà. Vérification manuelle nécessaire.</section>') +
      '<p><a href="/api/quickbooks/order-sync-status">Vérifier les statistiques du registre</a></p>');
  }
  return page(intro +
    '<section><p class="warning">En confirmant, UNE entrée de simulation sera écrite dans quickbooks_order_sync, sans facture ni commande réelle.</p>' +
    `<form method="post" action="${PATH}"><input type="hidden" name="confirm" value="record-sandbox-qc-simulation"><button type="submit">Enregistrer la simulation dans D1</button></form></section>` +
    '<p>La simulation sera conservée en état manual_review pour ne jamais être traitée automatiquement.</p>');
}

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const origin = request.headers.get("Origin");
  const site = request.headers.get("Sec-Fetch-Site");
  if (site !== "same-origin" || (origin && origin !== "null" && origin !== new URL(request.url).origin)) {
    return page("<h1>Soumission extérieure refusée.</h1>", 403);
  }
  if (!(request.headers.get("Content-Type") ?? "").startsWith("application/x-www-form-urlencoded")) {
    return page("<h1>Format de formulaire invalide.</h1>", 415);
  }
  const form = await request.formData();
  if (form.get("confirm") !== "record-sandbox-qc-simulation") return page("<h1>Confirmation invalide.</h1>", 400);
  if (await readSimulation()) return Response.redirect(new URL(PATH, request.url), 303);

  const db = cmsEnv().DB;
  const connection = await db.prepare(
    "SELECT realm_id FROM quickbooks_connections WHERE environment='sandbox'",
  ).first<{ realm_id: string }>();
  if (connection?.realm_id !== REALM) return page("<h1>Sandbox inattendu : opération refusée.</h1>", 409);

  const now = new Date().toISOString();
  const snapshot = {
    id: TEST_ORDER, is_simulation: true, region: "qc", currency: "CAD",
    customer_name: "TEST Envol Québec", customer_phone: "0000000000",
    customer_email: null, delivery_address: "Adresse fictive",
    items: [{
      product_id: "simulation-only", article_number: "TEST-QC-01",
      name: "Jouet fictif", quantity: 1, unit_price: 25, line_total: 25,
    }],
    total: 25, created_at: now,
  };
  await db.prepare(
    "INSERT OR IGNORE INTO quickbooks_order_sync (" +
    "order_id,source,region,currency,environment,realm_id,doc_number," +
    "order_snapshot_json,state,created_at,updated_at) " +
    "VALUES (?,'admin','qc','CAD','sandbox',?,?,?,'manual_review',?,?)",
  ).bind(TEST_ORDER, REALM, DOC, JSON.stringify(snapshot), now, now).run();

  return Response.redirect(new URL(PATH, request.url), 303);
}
