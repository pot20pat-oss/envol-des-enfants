import { cmsEnv } from "@/lib/cms";
import { marketSettings, normalizeMarket, type Market } from "@/lib/markets";
import { categorizedMamaProduct } from "@/lib/doll-category";
import { withVerifiedConakryPrice } from "@/lib/reference-prices";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const geography = (request as Request & { cf?: { country?: string; regionCode?: string; timezone?: string } }).cf;
    const country = (geography?.country || request.headers.get("cf-ipcountry") || request.headers.get("x-vercel-ip-country") || "").toUpperCase();
    const timezone = geography?.timezone || url.searchParams.get("timezone") || "";
    const detectedRegion: Market = country === "CA" || (!country && timezone.startsWith("America/")) ? "qc" : "conakry";
    const region = url.searchParams.has("region") ? normalizeMarket(url.searchParams.get("region")) : detectedRegion;
    const visibility = region === "qc" ? "visible_qc" : "visible_conakry";
    const { results } = await cmsEnv().DB.prepare(`SELECT * FROM products WHERE ${visibility}=1 ORDER BY featured DESC,updated_at DESC`).all<Record<string, unknown>>();
    const settings = await cmsEnv().DB.prepare("SELECT key,value FROM settings").all<{ key: string; value: string }>();
    const promotions = await cmsEnv().DB.prepare("SELECT * FROM promotions WHERE active=1 AND (region=? OR region='both') AND (starts_at IS NULL OR starts_at<=?) AND (ends_at IS NULL OR ends_at>=?) ORDER BY created_at DESC")
      .bind(region, new Date().toISOString().slice(0, 10), new Date().toISOString().slice(0, 10)).all();
    const allSettings = Object.fromEntries(settings.results.map((entry) => [entry.key, entry.value]));

    const seenNames = new Set<string>();
    const deduplicatedResults = results.filter((product) => {
      const normalizedName = String(product.name_fr || "").trim().toLocaleLowerCase("fr");
      if (!normalizedName) return true;
      if (seenNames.has(normalizedName)) return false;
      seenNames.add(normalizedName);
      return true;
    });

    const products = deduplicatedResults.map(categorizedMamaProduct).map(withVerifiedConakryPrice).map((product) => {
      const stock = Number(product[`stock_${region}`] || 0);
      const regularPrice = Number(product[`price_${region}`] ?? (region === "conakry" ? product.price : 0));
      const promotionalPrice = Number(product[`promo_price_${region}`] || 0);
      return { ...product, price: promotionalPrice > 0 && promotionalPrice < regularPrice ? promotionalPrice : regularPrice, regular_price: regularPrice, stock, status: stock <= 0 ? "sold" : product.status === "sold" ? "available" : product.status, currency: region === "qc" ? "CAD" : "GNF" };
    });
    return Response.json({ products, settings: marketSettings(allSettings, region), promotions: promotions.results, region, detectedRegion });
  } catch {
    return Response.json({ products: [], settings: {}, promotions: [], region: "conakry", detectedRegion: "conakry" });
  }
}
