import { currentAdmin, forbidden } from "@/lib/cms";
import { accessTokenForSandbox } from "@/lib/quickbooks-oauth";

/** Read-only validation before testing a GNF invoice in the Canadian QBO Sandbox. */
const TEST_REALM = "9341458454408573";
const CUSTOMER_NAME = "TEST Envol Conakry";

export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

  try {
    const auth = await accessTokenForSandbox();
    if (!auth || auth.realmId !== TEST_REALM) {
      return Response.json({ verified: false, error: "Entreprise QuickBooks Sandbox inattendue." }, {
        status: 409, headers,
      });
    }
    const url = new URL(`https://sandbox-quickbooks.api.intuit.com/v3/company/${TEST_REALM}/query`);
    url.searchParams.set("query", `SELECT * FROM Customer WHERE DisplayName = '${CUSTOMER_NAME}'`);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return Response.json({
        verified: false,
        error: `QuickBooks Sandbox a répondu HTTP ${response.status}`,
      }, { status: 502, headers });
    }

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") throw new Error("Invalid QuickBooks response");
    const queryResponse = (payload as Record<string, unknown>).QueryResponse;
    if (!queryResponse || typeof queryResponse !== "object") throw new Error("Missing QueryResponse");
    const matches = (queryResponse as Record<string, unknown>).Customer;
    if (!Array.isArray(matches) || matches.length !== 1) {
      return Response.json({
        verified: false,
        error: "Client de test Conakry introuvable ou ambigu dans QuickBooks Sandbox.",
      }, { status: 404, headers });
    }

    const customer = matches[0] as Record<string, unknown>;
    const currency = customer.CurrencyRef;
    const currencyCode = currency && typeof currency === "object"
      ? (currency as Record<string, unknown>).value : null;
    const valid = customer.DisplayName === CUSTOMER_NAME
      && typeof customer.Id === "string"
      && currencyCode === "GNF"
      && customer.Active !== false;

    return Response.json({
      verified: valid,
      environment: "sandbox",
      company: "Sandbox Company CA 2d21",
      customer_name: customer.DisplayName === CUSTOMER_NAME ? CUSTOMER_NAME : null,
      customer_id: typeof customer.Id === "string" ? customer.Id : null,
      customer_currency: typeof currencyCode === "string" ? currencyCode : null,
      active: customer.Active !== false,
      ready_for_gnf_invoice_test: valid,
    }, { headers });
  } catch {
    return Response.json({
      verified: false,
      error: "Vérification du client Conakry impossible. Aucune facture créée.",
    }, { status: 502, headers });
  }
}
