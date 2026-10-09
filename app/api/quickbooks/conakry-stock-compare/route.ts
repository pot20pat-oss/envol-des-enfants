import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { accessTokenForSandbox } from "@/lib/quickbooks-oauth";

const REALM = "9341458454408573";
const CMS_PRODUCT_ID = "mama3-02";
const CMS_ARTICLE = "PIS-0016";
const QBO_TEST_ITEM_ID = "29";
const QBO_TEST_SKU = "ENV-CN-TEST-PIS0016";
const QBO_TEST_NAME = "TEST Conakry - Accessoire baignade rose";
const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

/** Read-only comparison of one REAL CMS record with one SANDBOX test item.
 * A sandbox test SKU must never be written to permanent product mappings
 * or used to change the real boutique's stock.
 */
export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();

  try {
    const runtime = cmsEnv();
    if (runtime.QUICKBOOKS_MODE !== "sandbox") {
      return Response.json({ verified: false, error: "Mode Sandbox requis." }, { status: 409, headers: HEADERS });
    }

    const product = await runtime.DB.prepare(
      "SELECT id,article_number,name_fr,stock_conakry,price_conakry " +
      "FROM products WHERE id=?"
    ).bind(CMS_PRODUCT_ID).first<{
      id: string;
      article_number: string | null;
      name_fr: string;
      stock_conakry: number;
      price_conakry: number | null;
    }>();

    if (!product || product.article_number !== CMS_ARTICLE) {
      return Response.json({
        verified: false,
        error: "Produit CMS introuvable ou référence modifiée. Comparaison annulée."
      }, { status: 409, headers: HEADERS });
    }

    const auth = await accessTokenForSandbox();
    if (!auth || auth.realmId !== REALM) {
      return Response.json({ verified: false, error: "Connexion au Sandbox inattendue." },
        { status: 409, headers: HEADERS });
    }

    const response = await fetch(
      `https://sandbox-quickbooks.api.intuit.com/v3/company/${REALM}/item/${QBO_TEST_ITEM_ID}`,
      {
        headers: { Authorization: `Bearer ${auth.accessToken}`, Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!response.ok) {
      return Response.json({
        verified: false,
        error: "Lecture QuickBooks impossible.",
        qbo_http_status: response.status,
      }, { status: 502, headers: HEADERS });
    }
    const payload = await response.json() as {
      Item?: {
        Id?: string;
        Name?: string;
        Sku?: string;
        Type?: string;
        TrackQtyOnHand?: boolean;
        QtyOnHand?: number;
        Active?: boolean;
      };
    };
    const item = payload?.Item;
    const itemVerified = item?.Id === QBO_TEST_ITEM_ID && item?.Name === QBO_TEST_NAME &&
      item?.Sku === QBO_TEST_SKU && item?.Type === "Inventory" &&
      item?.TrackQtyOnHand === true && item?.Active !== false &&
      typeof item?.QtyOnHand === "number" && Number.isFinite(item.QtyOnHand);
    if (!itemVerified) {
      return Response.json({
        verified: false,
        error: "Identité de l'article fictif QuickBooks non confirmée. Aucun rapprochement.",
      }, { status: 409, headers: HEADERS });
    }

    const qboStock = item!.QtyOnHand!;
    const cmsStock = product.stock_conakry;
    return Response.json({
      verified: true,
      environment: "sandbox",
      comparison_only: true,
      mapping_created: false,
      ready_to_sync: false,
      stocks_modified: false,
      invoice_created: false,
      cms: {
        product_id: product.id,
        article_number: product.article_number,
        region: "conakry",
        currency: "GNF",
        stock: cmsStock,
        listed_price_gnf: product.price_conakry,
      },
      quickbooks_test: {
        item_id: item!.Id,
        sku: item!.Sku,
        type: item!.Type,
        stock: qboStock,
      },
      stock_difference_cms_minus_sandbox: cmsStock - qboStock,
      reason_not_synced: "Article QuickBooks fictif de test. Ne pas synchroniser son stock avec un produit CMS réel.",
    }, { headers: HEADERS });
  } catch {
    return Response.json({
      verified: false,
      error: "Rapprochement en lecture seule impossible. Aucun stock modifié.",
    }, { status: 502, headers: HEADERS });
  }
}
