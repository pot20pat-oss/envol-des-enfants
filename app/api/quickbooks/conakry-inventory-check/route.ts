import { currentAdmin, forbidden } from "@/lib/cms";
import { accessTokenForSandbox } from "@/lib/quickbooks-oauth";

const REALM = "9341458454408573";
const EXPECTED_NAME = "TEST Conakry - Accessoire baignade rose";
const EXPECTED_SKU = "ENV-CN-TEST-PIS0016";
const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

/** Sandbox-only, admin-only inventory diagnostic; no stock or invoice writes. */
export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  try {
    const auth = await accessTokenForSandbox();
    if (!auth || auth.realmId !== REALM) {
      return Response.json({
        verified: false, error: "Entreprise Sandbox inattendue ou non connectée.",
      }, { status: 409, headers: HEADERS });
    }
    const url = new URL(`https://sandbox-quickbooks.api.intuit.com/v3/company/${REALM}/query`);
    url.searchParams.set("query", `SELECT * FROM Item WHERE Name = '${EXPECTED_NAME}'`);
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      return Response.json({
        verified: false, error: "Lecture de l'inventaire QuickBooks indisponible.",
        quickbooks_http_status: response.status,
      }, { status: 502, headers: HEADERS });
    }

    const body = await response.json() as {
      QueryResponse?: {
        Item?: Array<{
          Id?: string; Name?: string; Sku?: string; Type?: string;
          QtyOnHand?: number; TrackQtyOnHand?: boolean; Active?: boolean;
          UnitPrice?: number; PurchaseCost?: number;
          AssetAccountRef?: { value?: string };
          ExpenseAccountRef?: { value?: string };
          IncomeAccountRef?: { value?: string };
        }>;
      };
    };
    const items = body?.QueryResponse?.Item;
    if (!items || items.length !== 1) {
      return Response.json({
        verified: false,
        error: "Article de test introuvable ou plusieurs articles portent ce nom.",
        matches: items?.length ?? 0,
      }, { status: 404, headers: HEADERS });
    }

    const item = items[0];
    const isInventory = item.Type === "Inventory" && item.TrackQtyOnHand === true;
    const fieldsMatch = item.Name === EXPECTED_NAME && item.Sku === EXPECTED_SKU &&
      typeof item.Id === "string" && item.Active !== false && isInventory;
    const stockDecreasedByOne = item.QtyOnHand === 1;
    return Response.json({
      verified: fieldsMatch,
      environment: "sandbox",
      company: "Sandbox Company CA 2d21",
      item_id: item.Id ?? null,
      item_name: item.Name ?? null,
      sku: item.Sku ?? null,
      item_type: item.Type ?? null,
      tracks_stock: item.TrackQtyOnHand === true,
      quantity_on_hand: typeof item.QtyOnHand === "number" ? item.QtyOnHand : null,
      expected_quantity_after_one_sale: 1,
      stock_decreased_by_one: stockDecreasedByOne,
      sale_price_cad: typeof item.UnitPrice === "number" ? item.UnitPrice : null,
      purchase_cost_cad: typeof item.PurchaseCost === "number" ? item.PurchaseCost : null,
      invoice_created_by_this_check: false,
      stock_modified_by_this_check: false,
    }, { headers: HEADERS });
  } catch {
    return Response.json({
      verified: false,
      error: "Vérification de l'inventaire impossible. Aucune modification de stock effectuée.",
    }, { status: 502, headers: HEADERS });
  }
}
