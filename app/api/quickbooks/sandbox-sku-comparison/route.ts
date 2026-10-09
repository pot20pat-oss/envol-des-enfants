import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";
import { accessTokenForSandbox } from "@/lib/quickbooks-oauth";

const REALM = "9341458454408573";
const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const TEST_IDS = new Set(["28", "29"]);
const TEST_SKUS = new Set(["ENV-QC-TEST-001", "ENV-CN-TEST-PIS0016"]);

type CmsItem = {
  id: string;
  article_number: string | null;
  name_fr: string | null;
  visible_qc: number | null;
  visible_conakry: number | null;
  price_qc: number | null;
  price_conakry: number | null;
  stock_qc: number | null;
  stock_conakry: number | null;
};
type QboItem = {
  Id?: string;
  Name?: string;
  Sku?: string;
  Type?: string;
  TrackQtyOnHand?: boolean;
  Active?: boolean;
  QtyOnHand?: number;
};
type Region = "qc" | "conakry";

function propose(region: Region, product: CmsItem): string | null {
  const article = (product.article_number || "").trim();
  if (!article) return null;
  const key = (region === "qc" ? "ENV-QC-" : "ENV-CN-") + article;
  return key.length <= 100 ? key : null;
}
function candidate(region: Region, item: CmsItem): boolean {
  const visible = region === "qc" ? item.visible_qc : item.visible_conakry;
  const price = region === "qc" ? item.price_qc : item.price_conakry;
  const stock = region === "qc" ? item.stock_qc : item.stock_conakry;
  return Number(visible) === 1 && Number(price) > 0 &&
    Number.isSafeInteger(stock) && Number(stock) > 0 &&
    propose(region, item) !== null;
}

/**
 * Admin-only read-only comparison against *test* QuickBooks company.
 * Results never auto-create mappings or authorize synchronization.
 * The OAuth helper may rotate expired credentials but never posts invoices.
 */
export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  const runtime = cmsEnv();
  if (runtime.QUICKBOOKS_MODE !== "sandbox") {
    return Response.json({
      verified: false,
      error: "Diagnostic accessible uniquement en mode Sandbox.",
    }, { status: 409, headers: HEADERS });
  }
  try {
    const auth = await accessTokenForSandbox();
    if (!auth || auth.realmId !== REALM) {
      return Response.json({
        verified: false,
        error: "La compagnie QuickBooks de test attendue n'est pas connectée.",
      }, { status: 409, headers: HEADERS });
    }
    const url = new URL(`https://sandbox-quickbooks.api.intuit.com/v3/company/${REALM}/query`);
    url.searchParams.set("query", "SELECT * FROM Item STARTPOSITION 1 MAXRESULTS 1000");
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      return Response.json({
        verified: false,
        quickbooks_http_status: response.status,
        error: "Lecture des articles Sandbox QuickBooks indisponible. Aucune modification effectuée.",
      }, { status: 502, headers: HEADERS });
    }
    const body = await response.json() as {
      QueryResponse?: { Item?: QboItem[]; maxResults?: number; startPosition?: number };
      Fault?: unknown;
    };
    if (!body.QueryResponse) {
      return Response.json({
        verified: false,
        error: "Réponse de lecture QuickBooks non reconnue.",
      }, { status: 502, headers: HEADERS });
    }

    const items = body.QueryResponse.Item || [];
    const possibleTruncation = items.length >= 1000;
    const inventory = items.filter(item =>
      item.Type === "Inventory" && item.TrackQtyOnHand === true &&
      item.Active !== false && typeof item.Id === "string" &&
      typeof item.Sku === "string" && !!item.Sku.trim()
    );
    const testOnly = inventory.filter(item =>
      TEST_IDS.has(item.Id!) || TEST_SKUS.has(item.Sku!.trim().toUpperCase()) ||
      /^ENV-(QC|CN)-TEST-/.test(item.Sku!.trim().toUpperCase())
    );
    const legitimate = inventory.filter(item => !testOnly.includes(item));
    const bySku = new Map<string, QboItem[]>();
    for (const item of legitimate) {
      const sku = item.Sku!.trim().toUpperCase();
      bySku.set(sku, [...(bySku.get(sku) || []), item]);
    }

    const { results: products } = await runtime.DB.prepare(
      "SELECT id,article_number,name_fr,visible_qc,visible_conakry," +
      "price_qc,price_conakry,stock_qc,stock_conakry FROM products"
    ).all<CmsItem>();
    const counts = new Map<string, number>();
    for (const product of products) {
      const normalized = (product.article_number || "").trim().toUpperCase();
      if (normalized) counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }

    const regions = (["qc", "conakry"] as const).map(region => {
      const matches: Array<{
        product_id: string;
        cms_article_number: string;
        qbo_item_id: string;
        qbo_sku: string;
        cms_stock: number;
        sandbox_qbo_stock: number | null;
        identity_verified: false;
      }> = [];
      let candidateCount = 0;
      let exactSkuMatches = 0;
      let ambiguousSkuMatches = 0;
      let missingSku = 0;
      for (const item of products) {
        if (!candidate(region, item)) continue;
        const article = item.article_number!.trim();
        if (counts.get(article.toUpperCase()) !== 1) continue;
        candidateCount++;
        const sku = propose(region, item)!;
        const found = bySku.get(sku.toUpperCase()) || [];
        if (found.length === 0) { missingSku++; continue; }
        if (found.length > 1) { ambiguousSkuMatches++; continue; }
        exactSkuMatches++;
        if (matches.length < 10) matches.push({
          product_id: item.id,
          cms_article_number: article,
          qbo_item_id: found[0].Id!,
          qbo_sku: found[0].Sku!,
          cms_stock: region === "qc" ? Number(item.stock_qc) : Number(item.stock_conakry),
          sandbox_qbo_stock: Number.isFinite(found[0].QtyOnHand)
            ? Number(found[0].QtyOnHand) : null,
          identity_verified: false,
        });
      }
      return {
        region,
        cms_candidates: candidateCount,
        exact_sku_matches_not_verified: exactSkuMatches,
        ambiguous_sku_matches: ambiguousSkuMatches,
        no_sandbox_sku_match: missingSku,
        sample_unverified_matches: matches,
        product_mappings_created: 0,
      };
    });

    return Response.json({
      verified: true,
      environment: "sandbox",
      read_only: true,
      sandbox_company_realm: REALM,
      qbo_item_records_examined: items.length,
      qbo_inventory_records_with_sku: inventory.length,
      known_demo_inventory_excluded: testOnly.length,
      qbo_pagination_incomplete: possibleTruncation,
      regions,
      identity_mappings_created: false,
      inventory_adjustments_created: false,
      invoices_created: false,
      real_quickbooks_company_connected: false,
      ready_for_bidirectional_stock_sync: false,
      notes: [
        "Les SKU suggérés sont hypothétiques : une égalité de texte ne vérifie ni le produit ni la valorisation.",
        "Les deux articles de test Inventory et leurs variantes TEST restent exclus des associations.",
        "Ce diagnostic lit seulement la compagnie de test Intuit et n'autorise aucun lien vers les produits réels.",
        "Les résultats doivent être vérifiés avec la cliente et son comptable avant une mise en production.",
      ],
    }, { headers: HEADERS });
  } catch (err) {
    console.error("QuickBooks sandbox SKU comparison failed", err);
    return Response.json({
      verified: false,
      read_only: true,
      error: "Comparaison QuickBooks indisponible; aucune donnée comptable modifiée.",
    }, { status: 503, headers: HEADERS });
  }
}
