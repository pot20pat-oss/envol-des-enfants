import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { accessTokenForSandbox } from "@/lib/quickbooks-oauth";

const REALM = "9341458454408573";
const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
type Item = { Id?: string; Name?: string; Sku?: string; Type?: string; QtyOnHand?: number; PurchaseCost?: number; UnitPrice?: number; Active?: boolean };

/** Admin-only, sandbox-only, bounded read of QuickBooks items for manual reconciliation. */
export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  try {
    if (cmsEnv().QUICKBOOKS_MODE !== "sandbox") {
      return Response.json({ error: "Mode Sandbox requis.", read_only: true }, { status: 409, headers: HEADERS });
    }
    const auth = await accessTokenForSandbox();
    if (!auth || auth.realmId !== REALM) {
      return Response.json({ error: "Connexion QuickBooks Sandbox non vérifiée.", read_only: true }, { status: 409, headers: HEADERS });
    }
    const items: Item[] = [];
    for (let start = 1; start <= 2001; start += 1000) {
      const url = new URL(`https://sandbox-quickbooks.api.intuit.com/v3/company/${REALM}/query`);
      url.searchParams.set("query", `SELECT * FROM Item STARTPOSITION ${start} MAXRESULTS 1000`);
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${auth.accessToken}`, Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        return Response.json({ error: "Lecture des articles Sandbox indisponible.", quickbooks_http_status: response.status, read_only: true }, { status: 502, headers: HEADERS });
      }
      const body = await response.json() as { QueryResponse?: { Item?: Item[] } };
      if (!body.QueryResponse || !Array.isArray(body.QueryResponse.Item || [])) {
        return Response.json({ error: "Réponse QuickBooks invalide.", read_only: true }, { status: 502, headers: HEADERS });
      }
      const page = body.QueryResponse.Item || [];
      items.push(...page);
      if (page.length < 1000) break;
      if (start === 2001) {
        return Response.json({ error: "Plus de 3000 articles : lecture partielle refusée.", read_only: true }, { status: 409, headers: HEADERS });
      }
    }
    return Response.json({
      verified: true, read_only: true, environment: "sandbox", currency: "CAD",
      account_is_test_company: true, real_company_connected: false,
      total_items: items.length, cms_modified: false, quickbooks_modified: false,
      items: items.map(item => ({
        id: item.Id ?? "", name: item.Name ?? "", sku: item.Sku ?? "",
        type: item.Type ?? "", stock: typeof item.QtyOnHand === "number" ? item.QtyOnHand : null,
        purchase_cost_cad: typeof item.PurchaseCost === "number" ? item.PurchaseCost : null,
        sale_price_cad: typeof item.UnitPrice === "number" ? item.UnitPrice : null,
        active: item.Active !== false,
      })),
    }, { headers: HEADERS });
  } catch (cause) {
    console.error("QuickBooks sandbox items read failed", cause);
    return Response.json({ error: "Lecture QuickBooks indisponible. Aucune modification effectuée.", read_only: true }, { status: 503, headers: HEADERS });
  }
}
