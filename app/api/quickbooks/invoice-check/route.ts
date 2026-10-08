import { currentAdmin, forbidden } from "@/lib/cms";
import { accessTokenForSandbox } from "@/lib/quickbooks-oauth";

type QboRef = { value?: unknown };
type QboInvoice = {
  Id?: unknown;
  DocNumber?: unknown;
  TotalAmt?: unknown;
  Balance?: unknown;
  CustomerRef?: QboRef;
  CurrencyRef?: QboRef;
  Line?: Array<{
    DetailType?: unknown;
    Description?: unknown;
    Amount?: unknown;
    SalesItemLineDetail?: {
      ItemRef?: QboRef;
      TaxCodeRef?: QboRef;
      Qty?: unknown;
      UnitPrice?: unknown;
    };
  }>;
};

/**
 * Lecture seule : compare la facture manuelle no 1017 à ce que l'API renvoie.
 * Limité à QuickBooks Sandbox et aux administrateurs du CMS.
 */
export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  try {
    const auth = await accessTokenForSandbox();
    if (!auth) {
      return Response.json({ verified: false, error: "Sandbox QuickBooks non connectée." }, {
        status: 503, headers: { "Cache-Control": "no-store" },
      });
    }

    const query = "SELECT * FROM Invoice WHERE DocNumber = '1017'";
    const url = new URL(`https://sandbox-quickbooks.api.intuit.com/v3/company/${auth.realmId}/query`);
    url.searchParams.set("query", query);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return Response.json({
        verified: false,
        error: `QuickBooks Sandbox a répondu HTTP ${response.status}.`,
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    const raw: unknown = await response.json();
    if (!raw || typeof raw !== "object") throw new Error("Invalid QuickBooks response");
    const queryResponse = (raw as Record<string, unknown>).QueryResponse;
    if (!queryResponse || typeof queryResponse !== "object") throw new Error("Missing QueryResponse");
    const invoices = (queryResponse as Record<string, unknown>).Invoice;
    if (!Array.isArray(invoices) || invoices.length !== 1) {
      return Response.json({
        verified: false, invoice_number: "1017",
        error: "La facture 1017 est introuvable ou non unique dans le Sandbox.",
      }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    const invoice = invoices[0] as QboInvoice;
    const salesLines = Array.isArray(invoice.Line)
      ? invoice.Line.filter(line => line.DetailType === "SalesItemLineDetail")
      : [];
    const stringOrNull = (value: unknown): string | null =>
      typeof value === "string" ? value : null;
    const numberOrNull = (value: unknown): number | null =>
      typeof value === "number" && Number.isFinite(value) ? value : null;

    return Response.json({
      verified: true,
      environment: "sandbox",
      invoice: {
        id: stringOrNull(invoice.Id),
        number: stringOrNull(invoice.DocNumber),
        currency: stringOrNull(invoice.CurrencyRef?.value),
        total: numberOrNull(invoice.TotalAmt),
        balance: numberOrNull(invoice.Balance),
        customer_id: stringOrNull(invoice.CustomerRef?.value),
        lines: salesLines.map(line => ({
          description: stringOrNull(line.Description),
          amount: numberOrNull(line.Amount),
          item_id: stringOrNull(line.SalesItemLineDetail?.ItemRef?.value),
          tax_code_id: stringOrNull(line.SalesItemLineDetail?.TaxCodeRef?.value),
          quantity: numberOrNull(line.SalesItemLineDetail?.Qty),
          unit_price: numberOrNull(line.SalesItemLineDetail?.UnitPrice),
        })),
      },
    }, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch {
    return Response.json({
      verified: false,
      error: "Lecture de la facture Sandbox impossible. Aucun changement comptable effectué.",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
