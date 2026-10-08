import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { accessTokenForSandbox } from "@/lib/quickbooks-oauth";

const REALM = "9341458454408573";
const ID = "183";
const DOC_NUMBER = "ENV-TEST-CAD-001";
const RUN_KEY = "fix_sandbox_invoice_183_number_v1";
const URL = "/api/quickbooks/sandbox-invoice-number-fix";

type InvoiceData = Record<string, unknown>;
type RunData = { status: string; error_code: string | null };

function safeText(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, char =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}
function page(content: string, status = 200): Response {
  return new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Numéro facture QuickBooks Sandbox</title><style>body{font:16px/1.55 system-ui,sans-serif;max-width:680px;margin:48px auto;padding:0 20px;color:#1b2834}section{padding:20px;border:1px solid #ccd6df;border-radius:12px;margin:18px 0}button{background:#08614b;color:#fff;font:inherit;padding:12px 18px;border:0;border-radius:9px;cursor:pointer}</style></head><body>${content}</body></html>`, {
    status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}

async function sandboxAuth() {
  const auth = await accessTokenForSandbox();
  return auth?.realmId === REALM ? auth : null;
}

async function getInvoice(accessToken: string): Promise<InvoiceData> {
  const response = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${REALM}/invoice/${ID}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Impossible de lire la facture QuickBooks.");
  const data = await response.json() as { Invoice?: InvoiceData };
  if (!data.Invoice) throw new Error("Facture non trouvée.");
  return data.Invoice;
}

function isExpectedInvoice(inv: InvoiceData): boolean {
  const currency = inv.CurrencyRef as { value?: string } | undefined;
  const customer = inv.CustomerRef as { value?: string } | undefined;
  return inv.Id === ID && inv.TotalAmt === 25 && inv.Balance === 25
    && currency?.value === "CAD" && customer?.value === "67"
    && typeof inv.PrivateNote === "string"
    && inv.PrivateNote.includes("AIP TEST API SANDBOX CAD 25");
}

async function previousRun(): Promise<RunData | null> {
  return cmsEnv().DB.prepare(
    "SELECT status,error_code FROM quickbooks_sandbox_test_runs WHERE test_key=?",
  ).bind(RUN_KEY).first<RunData>();
}

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  try {
    const auth = await sandboxAuth();
    if (!auth) return page("<h1>Entreprise Sandbox inattendue. Aucune action.</h1>", 409);
    const inv = await getInvoice(auth.accessToken);
    const run = await previousRun();
    let content = "<h1>Corriger le numéro de la facture de test</h1><section>" +
      "<strong>Entreprise :</strong> Sandbox Company CA 2d21<br>" +
      "<strong>Facture interne :</strong> 183<br>" +
      "<strong>Numéro actuel :</strong> " + safeText(inv.DocNumber ?? "(aucun)") + "<br>" +
      "<strong>Nouveau numéro proposé :</strong> " + DOC_NUMBER + "<br>" +
      "<strong>Montant :</strong> 25,00 $ CAD<br><strong>Solde à payer :</strong> 25,00 $ CAD</section>";
    if (run) {
      content += "<section><strong>Correction déjà tentée :</strong> " + safeText(run.status) +
        "<br><strong>Code :</strong> " + safeText(run.error_code ?? "aucun") + "</section>";
    } else if (inv.DocNumber === DOC_NUMBER) {
      content += "<p>Le numéro est déjà correct. Aucune action nécessaire.</p>";
    } else if (!isExpectedInvoice(inv) || inv.DocNumber) {
      content += "<p>Protection : cette facture ne correspond pas au test attendu, ou possède déjà un numéro. Modification interdite.</p>";
    } else {
      content += '<section><p>Cette action ajoutera uniquement un numéro à la facture fictive. Elle ne change pas le montant, la devise, le client ni le paiement.</p>' +
        `<form method="post" action="${URL}"><input type="hidden" name="confirm" value="fix-183-once"><button type="submit">Attribuer le numéro ${DOC_NUMBER}</button></form></section>`;
    }
    return page(content + '<p><a href="/admin">Retour au CMS</a></p>');
  } catch {
    return page("<h1>Vérification impossible. Aucune action effectuée.</h1>", 502);
  }
}

export async function POST(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const origin = request.headers.get("Origin");
  const site = request.headers.get("Sec-Fetch-Site");
  if (site !== "same-origin" || (origin && origin !== "null" && origin !== new URL(request.url).origin)) {
    return page("<h1>Soumission intersites refusée.</h1>", 403);
  }
  if (!(request.headers.get("Content-Type") || "").startsWith("application/x-www-form-urlencoded")) {
    return page("<h1>Format invalide.</h1>", 415);
  }
  const body = await request.formData();
  if (body.get("confirm") !== "fix-183-once") return page("<h1>Confirmation invalide.</h1>", 400);
  const auth = await sandboxAuth();
  if (!auth) return page("<h1>Entreprise inattendue.</h1>", 409);
  if (await previousRun()) return Response.redirect(new URL(URL, request.url), 303);

  let invoice: InvoiceData;
  try { invoice = await getInvoice(auth.accessToken); }
  catch { return page("<h1>Facture introuvable ou API indisponible.</h1>", 502); }
  if (!isExpectedInvoice(invoice) || invoice.DocNumber) {
    return page("<h1>La facture ne correspond plus au test attendu. Aucune modification.</h1>", 409);
  }
  if (typeof invoice.SyncToken !== "string") return page("<h1>Version de facture indisponible.</h1>", 502);

  // Ensure our proposed invoice number does not already exist.
  const lookup = new URL(`https://sandbox-quickbooks.api.intuit.com/v3/company/${REALM}/query`);
  lookup.searchParams.set("query", `SELECT Id FROM Invoice WHERE DocNumber = '${DOC_NUMBER}'`);
  try {
    const check = await fetch(lookup.toString(), {
      headers: { Authorization: `Bearer ${auth.accessToken}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!check.ok) return page("<h1>Vérification d'unicité impossible.</h1>", 502);
    const result = await check.json() as { QueryResponse?: { Invoice?: unknown[] } };
    if (result.QueryResponse?.Invoice?.length) return page("<h1>Numéro déjà utilisé. Aucune modification.</h1>", 409);
  } catch { return page("<h1>Vérification d'unicité indisponible.</h1>", 502); }

  const db = cmsEnv().DB;
  const now = new Date().toISOString();
  const held = await db.prepare(
    "INSERT OR IGNORE INTO quickbooks_sandbox_test_runs " +
    "(test_key,realm_id,status,created_at,updated_at) VALUES (?,?,'attempting',?,?) RETURNING test_key",
  ).bind(RUN_KEY, REALM, now, now).first<{ test_key: string }>();
  if (!held) return Response.redirect(new URL(URL, request.url), 303);

  try {
    const response = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${REALM}/invoice`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: "application/json", "Content-Type": "application/json",
      },
      body: JSON.stringify({ Id: ID, SyncToken: invoice.SyncToken, sparse: true, DocNumber: DOC_NUMBER }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      await db.prepare(
        "UPDATE quickbooks_sandbox_test_runs SET status=?,error_code=?,updated_at=? WHERE test_key=?",
      ).bind(response.status >= 500 ? "unknown" : "rejected", `intuit_http_${response.status}`, new Date().toISOString(), RUN_KEY).run();
      return Response.redirect(new URL(URL, request.url), 303);
    }
    const result = await response.json() as { Invoice?: InvoiceData };
    const updated = result.Invoice;
    const status = updated && updated.Id === ID && updated.DocNumber === DOC_NUMBER
      && updated.TotalAmt === 25 && updated.Balance === 25 ? "succeeded" : "unknown";
    await db.prepare(
      "UPDATE quickbooks_sandbox_test_runs SET status=?,invoice_id=?,invoice_number=?,total_amount=?," +
      "open_balance=?,updated_at=? WHERE test_key=?",
    ).bind(status, ID, updated?.DocNumber ?? null, updated?.TotalAmt ?? null,
      updated?.Balance ?? null, new Date().toISOString(), RUN_KEY).run();
  } catch {
    await db.prepare(
      "UPDATE quickbooks_sandbox_test_runs SET status='unknown',error_code='transport_error',updated_at=? WHERE test_key=?",
    ).bind(new Date().toISOString(), RUN_KEY).run();
  }
  return Response.redirect(new URL(URL, request.url), 303);
}
