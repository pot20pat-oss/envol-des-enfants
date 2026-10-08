import { currentAdmin, forbidden } from "@/lib/cms";
import { accessTokenForSandbox } from "@/lib/quickbooks-oauth";

const EXPECTED_TEST_REALM = "9341458454408573";
const INVOICE_ID = "183";

/** Read-only diagnostic: QBO's invoice-number preference and sandbox invoice 183. */
export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
  try {
    const authorization = await accessTokenForSandbox();
    if (!authorization || authorization.realmId !== EXPECTED_TEST_REALM) {
      return Response.json({ verified: false, error: "Entreprise Sandbox inattendue ou non connectée." }, {
        status: 409, headers,
      });
    }
    const base = `https://sandbox-quickbooks.api.intuit.com/v3/company/${EXPECTED_TEST_REALM}`;
    const apiHeaders = {
      Authorization: `Bearer ${authorization.accessToken}`,
      Accept: "application/json",
    };
    const [prefsResponse, invoiceResponse] = await Promise.all([
      fetch(`${base}/preferences`, { headers: apiHeaders, signal: AbortSignal.timeout(15_000) }),
      fetch(`${base}/invoice/${INVOICE_ID}`, { headers: apiHeaders, signal: AbortSignal.timeout(15_000) }),
    ]);
    if (!prefsResponse.ok || !invoiceResponse.ok) {
      return Response.json({
        verified: false,
        error: "Lecture QuickBooks Sandbox impossible.",
        preferences_http_status: prefsResponse.status,
        invoice_http_status: invoiceResponse.status,
      }, { status: 502, headers });
    }
    const preferenceJson: unknown = await prefsResponse.json();
    const invoiceJson: unknown = await invoiceResponse.json();
    const prefObj = preferenceJson && typeof preferenceJson === "object"
      ? (preferenceJson as Record<string, unknown>).Preferences : null;
    const salesPrefs = prefObj && typeof prefObj === "object"
      ? (prefObj as Record<string, unknown>).SalesFormsPrefs : null;
    const customNumber = salesPrefs && typeof salesPrefs === "object"
      ? (salesPrefs as Record<string, unknown>).CustomTxnNumbers : null;
    const invoiceObj = invoiceJson && typeof invoiceJson === "object"
      ? (invoiceJson as Record<string, unknown>).Invoice : null;
    if (!invoiceObj || typeof invoiceObj !== "object") {
      return Response.json({ verified: false, error: "Réponse facture incomplète." }, { status: 502, headers });
    }
    const inv = invoiceObj as Record<string, unknown>;
    return Response.json({
      verified: true,
      environment: "sandbox",
      company: "Sandbox Company CA 2d21",
      custom_transaction_numbers_enabled: typeof customNumber === "boolean" ? customNumber : null,
      invoice: {
        id: typeof inv.Id === "string" ? inv.Id : null,
        doc_number: typeof inv.DocNumber === "string" ? inv.DocNumber : null,
        total: typeof inv.TotalAmt === "number" ? inv.TotalAmt : null,
        unpaid_balance: typeof inv.Balance === "number" ? inv.Balance : null,
        currency: (inv.CurrencyRef && typeof inv.CurrencyRef === "object" &&
          typeof (inv.CurrencyRef as Record<string, unknown>).value === "string")
          ? (inv.CurrencyRef as Record<string, unknown>).value : null,
      },
    }, { headers });
  } catch {
    return Response.json({
      verified: false,
      error: "Diagnostic QuickBooks indisponible. Aucune modification comptable effectuée.",
    }, { status: 502, headers });
  }
}
