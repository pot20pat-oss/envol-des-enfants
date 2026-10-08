import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { accessTokenForSandbox, sandboxCredentials } from "@/lib/quickbooks-oauth";

const TEST_REALM = "9341458454408573";
const TEST_KEY = "gnf_invoice_100000_v1";
const ENDPOINT = "/api/quickbooks/sandbox-gnf-invoice-test";

type TestRun = {
  status: "attempting" | "succeeded" | "rejected" | "unknown";
  invoice_id: string | null;
  invoice_number: string | null;
  total_amount: number | null;
  open_balance: number | null;
  error_code: string | null;
  created_at: string;
};

function htmlEscape(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, match => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[match] || match));
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Essai QuickBooks Sandbox</title><style>
  body{font-family:system-ui,-apple-system,sans-serif;max-width:650px;margin:45px auto;padding:0 20px;line-height:1.55;color:#202935}
  h1{font-size:1.6rem}section{border:1px solid #cfd7df;border-radius:12px;padding:20px;margin:20px 0}
  button{background:#165d4c;color:white;font-size:1rem;font-weight:650;border:0;border-radius:8px;padding:12px 18px;cursor:pointer}
  button:focus{outline:3px solid #9ed2c7}small{color:#526070}a{color:#075c9b}
  .warning{border-left:4px solid #b57b20;padding-left:12px}
  </style></head><body>${body}</body></html>`, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function testRun(): Promise<TestRun | null> {
  return cmsEnv().DB.prepare(
    "SELECT status,invoice_id,invoice_number,total_amount,open_balance,error_code,created_at FROM quickbooks_sandbox_test_runs WHERE test_key=?",
  ).bind(TEST_KEY).first<TestRun>();
}

async function matchingSandbox(): Promise<boolean> {
  if (!sandboxCredentials()) return false;
  const company = await cmsEnv().DB.prepare(
    "SELECT realm_id FROM quickbooks_connections WHERE environment='sandbox'",
  ).first<{ realm_id: string }>();
  return company?.realm_id === TEST_REALM;
}

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const correctCompany = await matchingSandbox();
  const previous = await testRun();
  let content = '<h1>Test de facture QuickBooks par API</h1>' +
    '<p>Cette page est réservée au CMS. Elle ne déclenche aucune création automatiquement.</p>' +
    '<section><strong>Entreprise :</strong> Sandbox Company CA 2d21<br>' +
    '<strong>Devise :</strong> GNF<br><strong>Client :</strong> TEST Envol Conakry (ID 68)<br>' +
    '<strong>Article :</strong> Services (ID 1)<br><strong>Montant :</strong> 100 000 GNF<br>' +
    '<strong>Taxe :</strong> Out of Scope (0 %) — test uniquement<br><strong>Envoi courriel :</strong> non prévu<br>' +
    '<strong>Paiement :</strong> aucun</section>';
  if (!correctCompany) {
    content += '<section class="warning"><strong>Test bloqué.</strong> Le Sandbox attendu n’est pas connecté ou les secrets ne sont pas configurés.</section>';
  } else if (previous) {
    content += `<section><strong>Essai déjà lancé :</strong> ${htmlEscape(previous.status)}<br>` +
      `<strong>Facture QuickBooks :</strong> ${htmlEscape(previous.invoice_number || "non confirmée")}<br>` +
      `<strong>ID :</strong> ${htmlEscape(previous.invoice_id || "non confirmé")}<br>` +
      `<strong>Total :</strong> ${htmlEscape(previous.total_amount ?? "à vérifier")}<br>` +
      `<strong>Solde :</strong> ${htmlEscape(previous.open_balance ?? "à vérifier")}<br>` +
      `<strong>État technique :</strong> ${htmlEscape(previous.error_code || "aucune erreur enregistrée")}</section>`;
    content += '<p class="warning">La création unique ne peut pas être relancée. En cas de résultat incertain, vérifier QuickBooks avant toute autre opération.</p>';
  } else {
    content += '<section><p class="warning"><strong>Confirmation obligatoire :</strong> un clic créera UNE nouvelle facture dans QuickBooks Sandbox. Cela ne touche pas les commandes de la boutique ni la compagnie réelle.</p>' +
      `<form method="post" action="${ENDPOINT}"><input type="hidden" name="confirm" value="create-once"><button type="submit">Créer une facture de test de 100 000 GNF (une seule fois)</button></form></section>`;
  }
  content += '<p><small>Le bouton crée une facture mais n’enregistre aucun paiement et n’appelle pas l’API d’envoi par courriel.</small></p>' +
    '<p><a href="/admin">Retour au CMS</a></p>';
  return htmlResponse(content);
}

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  // Require browser Fetch Metadata to prove the POST came from this exact origin.
  // Edge can omit Origin on native forms, so do not depend on it alone.
  const origin = request.headers.get("Origin");
  const site = request.headers.get("Sec-Fetch-Site");
  if (site !== "same-origin" || (origin && origin !== "null" && origin !== new URL(request.url).origin)) {
    return htmlResponse("<h1>Soumission non autorisée : origine différente.</h1>", 403);
  }
  if (!(request.headers.get("Content-Type") || "").startsWith("application/x-www-form-urlencoded")) {
    return htmlResponse("<h1>Format de requête invalide.</h1>", 415);
  }
  const form = await request.formData();
  if (form.get("confirm") !== "create-once") return htmlResponse("<h1>Confirmation manquante.</h1>", 400);
  if (!await matchingSandbox()) return htmlResponse("<h1>Environnement de test non connecté.</h1>", 409);
  if (await testRun()) return Response.redirect(new URL(ENDPOINT, request.url), 303);

  // Validate or refresh tokens BEFORE creating the one-time execution reservation.
  const auth = await accessTokenForSandbox();
  if (!auth || auth.realmId !== TEST_REALM) {
    return htmlResponse("<h1>Connexion QuickBooks Sandbox indisponible.</h1>", 503);
  }

  const database = cmsEnv().DB;
  const now = new Date().toISOString();
  // Unique reservation: repeated clicks, page reloads, and concurrent POSTs cannot start a second write.
  const reserved = await database.prepare(
    "INSERT OR IGNORE INTO quickbooks_sandbox_test_runs " +
    "(test_key,realm_id,status,created_at,updated_at) VALUES (?,?,'attempting',?,?) RETURNING test_key",
  ).bind(TEST_KEY, TEST_REALM, now, now).first<{ test_key: string }>();
  if (!reserved) return Response.redirect(new URL(ENDPOINT, request.url), 303);

  // All references come from a manually verified invoice 1017 in this exact sandbox company.
  const invoiceBody = {
    DocNumber: "ENV-TEST-GNF-001",
    GlobalTaxCalculation: "TaxExcluded",
    CustomerRef: { value: "68" },
    CurrencyRef: { value: "GNF" },
    EmailStatus: "NotSet",
    AllowOnlinePayment: false,
    AllowOnlineCreditCardPayment: false,
    AllowOnlineACHPayment: false,
    PrivateNote: "AIP TEST API SANDBOX GNF 100000 - no payment, no email",
    Line: [{
      DetailType: "SalesItemLineDetail",
      Description: "TEST API - Achat jouet Conakry",
      Amount: 100000,
      SalesItemLineDetail: {
        ItemRef: { value: "1" },
        Qty: 1,
        UnitPrice: 100000,
        TaxCodeRef: { value: "6" },
      },
    }],
  };

  try {
    const response = await fetch(
      `https://sandbox-quickbooks.api.intuit.com/v3/company/${TEST_REALM}/invoice`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoiceBody),
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!response.ok) {
      // A 5xx or transport issue may have created the invoice; never retry automatically.
      const ambiguous = response.status >= 500;
      await database.prepare(
        "UPDATE quickbooks_sandbox_test_runs SET status=?,error_code=?,updated_at=? WHERE test_key=?",
      ).bind(ambiguous ? "unknown" : "rejected", `intuit_http_${response.status}`, new Date().toISOString(), TEST_KEY).run();
      return Response.redirect(new URL(ENDPOINT, request.url), 303);
    }

    const data: unknown = await response.json();
    const envelope = data && typeof data === "object" ? data as Record<string, unknown> : null;
    const invoice = envelope && typeof envelope.Invoice === "object" && envelope.Invoice
      ? envelope.Invoice as Record<string, unknown> : null;
    const invoiceId = typeof invoice?.Id === "string" ? invoice.Id : null;
    const invoiceNumber = typeof invoice?.DocNumber === "string" ? invoice.DocNumber : null;
    const total = typeof invoice?.TotalAmt === "number" ? invoice.TotalAmt : null;
    const balance = typeof invoice?.Balance === "number" ? invoice.Balance : null;
    if (!invoiceId) throw new Error("Invoice response missing ID");
    const correct = invoiceNumber === "ENV-TEST-GNF-001" &&
      total === 100000 && balance === 100000 &&
      (invoice?.CurrencyRef as { value?: string } | undefined)?.value === "GNF";
    await database.prepare(
      "UPDATE quickbooks_sandbox_test_runs SET status=?,invoice_id=?," +
      "invoice_number=?,total_amount=?,open_balance=?,error_code=?,updated_at=? WHERE test_key=?",
    ).bind(correct ? "succeeded" : "unknown", invoiceId, invoiceNumber, total,
      balance, correct ? null : "invoice_fields_mismatch", new Date().toISOString(), TEST_KEY).run();
  } catch {
    // Outcome of a network failure may be ambiguous. Prevent a second invoice.
    await database.prepare(
      "UPDATE quickbooks_sandbox_test_runs SET status='unknown',error_code='transport_or_parse_error',updated_at=? WHERE test_key=?",
    ).bind(new Date().toISOString(), TEST_KEY).run();
  }
  return Response.redirect(new URL(ENDPOINT, request.url), 303);
}
