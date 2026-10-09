import { cmsEnv, currentAdmin, forbidden } from "@/lib/cms";

const REALM = "9341458454408573";
const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

type Product = {
  id: string;
  article_number: string | null;
  name_fr: string | null;
  stock_qc: number | null;
  stock_conakry: number | null;
  price_qc: number | null;
  price_conakry: number | null;
  visible_qc: number | null;
  visible_conakry: number | null;
};
type Mapping = {
  product_id: string;
  region: string;
  environment: string;
  realm_id: string;
  qbo_item_id: string;
  qbo_item_sku: string;
  state: string;
};
type Region = "qc" | "conakry";

function analyze(
  region: Region,
  products: Product[],
  mappings: Mapping[],
) {
  const articleCounts = new Map<string, number>();
  for (const product of products) {
    const article = String(product.article_number || "").trim().toUpperCase();
    if (article) articleCounts.set(article, (articleCounts.get(article) || 0) + 1);
  }
  const associated = new Map(
    mappings.filter((map) => map.region === region).map((map) => [map.product_id, map]),
  );
  const stockKey = region === "qc" ? "stock_qc" : "stock_conakry";
  const priceKey = region === "qc" ? "price_qc" : "price_conakry";
  const visibleKey = region === "qc" ? "visible_qc" : "visible_conakry";
  const counts = {
    cms_products: products.length,
    visible: 0,
    missing_article_number: 0,
    duplicate_article_number: 0,
    nonpositive_price: 0,
    nonpositive_stock: 0,
    candidate_products: 0,
    mapped: associated.size,
    verified_mappings: 0,
    unverified_mappings: 0,
  };
  const sample: Array<{
    product_id: string;
    cms_article_number: string;
    name: string;
    stock: number;
    price: number;
    proposed_sku_format_only: string;
    mapping_state: string;
  }> = [];
  for (const product of products) {
    const visible = Number(product[visibleKey]) === 1;
    if (!visible) continue;
    counts.visible++;
    const article = String(product.article_number || "").trim();
    const normalized = article.toUpperCase();
    const stock = Number(product[stockKey]);
    const price = Number(product[priceKey]);
    if (!article) counts.missing_article_number++;
    if (article && articleCounts.get(normalized)! > 1) counts.duplicate_article_number++;
    if (!Number.isFinite(price) || price <= 0) counts.nonpositive_price++;
    if (!Number.isSafeInteger(stock) || stock <= 0) counts.nonpositive_stock++;

    const mapped = associated.get(product.id);
    if (mapped?.state === "verified") counts.verified_mappings++;
    else if (mapped) counts.unverified_mappings++;

    const prefix = region === "qc" ? "ENV-QC-" : "ENV-CN-";
    const suggested = prefix + article;
    if (!article || articleCounts.get(normalized)! > 1 ||
        !Number.isSafeInteger(stock) || stock <= 0 ||
        !Number.isFinite(price) || price <= 0 ||
        suggested.length > 100) continue;

    counts.candidate_products++;
    if (sample.length < 10) {
      sample.push({
        product_id: product.id,
        cms_article_number: article,
        name: String(product.name_fr || "Produit sans nom"),
        stock, price,
        proposed_sku_format_only: suggested,
        mapping_state: mapped?.state || "not_mapped",
      });
    }
  }
  return { region, currency: region === "qc" ? "CAD" : "GNF", counts, sample };
}

/** Read-only catalog and QBO identity preflight. Not an item-sync endpoint. */
export async function GET(request: Request) {
  if (!await currentAdmin(request)) return forbidden();
  try {
    const runtime = cmsEnv();
    const db = runtime.DB;
    const [catalog, rawMappings, connection] = await Promise.all([
      db.prepare(
        "SELECT id,article_number,name_fr,stock_qc,stock_conakry," +
        "price_qc,price_conakry,visible_qc,visible_conakry FROM products",
      ).all<Product>(),
      db.prepare(
        "SELECT product_id,region,environment,realm_id,qbo_item_id,qbo_item_sku,state " +
        "FROM quickbooks_product_mappings WHERE environment='sandbox' AND realm_id=?",
      ).bind(REALM).all<Mapping>(),
      db.prepare(
        "SELECT realm_id FROM quickbooks_connections WHERE environment='sandbox'",
      ).first<{ realm_id: string }>(),
    ]);

    const products = catalog.results || [];
    const mappings = rawMappings.results || [];
    const connectionValid = runtime.QUICKBOOKS_MODE === "sandbox" &&
      connection?.realm_id === REALM;
    const qc = analyze("qc", products, mappings);
    const conakry = analyze("conakry", products, mappings);
    return Response.json({
      verified: true,
      read_only: true,
      environment: runtime.QUICKBOOKS_MODE === "sandbox" ? "sandbox" : "not_sandbox",
      connected_to_expected_sandbox: connectionValid,
      sandbox_mapping_records: mappings.length,
      regions: [qc, conakry],
      mapping_creation_enabled: false,
      item_creation_enabled: false,
      inventory_updates_enabled: false,
      invoice_creation_enabled: false,
      quickbooks_api_called: false,
      cms_stock_modified: false,
      qbo_stock_modified: false,
      ready_for_bidirectional_stock_sync: false,
      notes: [
        "Ce diagnostic ne lit pas les articles de QuickBooks; les suggestions de SKU ne sont pas des correspondances vérifiées.",
        "Les articles QuickBooks de test ne doivent jamais être liés automatiquement à des produits réels du CMS.",
        "Chaque boutique nécessite un article Inventory QuickBooks distinct, avec une devise et une valorisation comptable vérifiées.",
        "Les correspondances seront activées seulement après validation manuelle du produit, du SKU, du marché et des règles fiscales.",
      ],
    }, { headers: HEADERS });
  } catch (cause) {
    console.error("QuickBooks product mapping readiness failed", cause);
    return Response.json({
      verified: false, read_only: true,
      error: "Diagnostic de correspondance indisponible. Aucune modification effectuée.",
    }, { status: 503, headers: HEADERS });
  }
}
