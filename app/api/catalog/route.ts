import { cmsEnv } from "@/lib/cms";
import { marketSettings, normalizeMarket, type Market } from "@/lib/markets";
import { categorizedMamaProduct } from "@/lib/doll-category";
import { withVerifiedConakryPrice } from "@/lib/reference-prices";
import { ensureArchiveProducts } from "@/lib/archive-products";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const geography = (request as Request & { cf?: { country?: string; regionCode?: string; timezone?: string } }).cf;
    const country = (geography?.country || request.headers.get("cf-ipcountry") || request.headers.get("x-vercel-ip-country") || "").toUpperCase();
    const timezone = geography?.timezone || url.searchParams.get("timezone") || "";
    const detectedRegion: Market = country === "CA" || (!country && timezone.startsWith("America/")) ? "qc" : "conakry";
    const region = url.searchParams.has("region") ? normalizeMarket(url.searchParams.get("region")) : detectedRegion;
    const visibility = region === "qc" ? "visible_qc" : "visible_conakry";
    const database = cmsEnv().DB;

    // L'import automatique ne doit jamais empêcher l'affichage des produits déjà présents.
    try {
      await ensureArchiveProducts(database);
    } catch (error) {
      console.error("Automatic product import failed; serving existing catalog instead.", error);
    }

    const { results } = await database.prepare(`SELECT * FROM products WHERE ${visibility}=1 ORDER BY featured DESC,updated_at DESC`).all<Record<string, unknown>>();
    const settings = await database.prepare("SELECT key,value FROM settings").all<{ key: string; value: string }>();
    const promotions = await database.prepare("SELECT * FROM promotions WHERE active=1 AND (region=? OR region='both') AND (starts_at IS NULL OR starts_at<=?) AND (ends_at IS NULL OR ends_at>=?) ORDER BY created_at DESC")
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

    // Les 4 cartes « Nouveautés » de l'accueil prennent les premiers produits badge=new.
    // On mélange donc les grandes familles avant de retourner le catalogue afin d'éviter
    // d'afficher quatre poupées simplement parce qu'elles ont été ajoutées en dernier.
    const dollCategories = new Set(["poupees", "princesses", "disney", "barbie", "mylife", "miraculous", "lol", "rainbowhigh", "babyalive", "hairmazing", "karma", "mysweetbaby", "glamourgirl", "autres_poupees"]);
    const schoolCategories = new Set(["scolaire", "sacs"]);
    const kidsCategories = new Set(["bebe", "vetements", "chaussures"]);
    const vehicleCategories = new Set(["vehicules"]);
    const noveltyGroup = (product: Record<string, unknown>) => {
      const category = String(product.category || "");
      if (dollCategories.has(category)) return "poupees";
      if (schoolCategories.has(category)) return "scolaire";
      if (kidsCategories.has(category)) return "enfants";
      if (vehicleCategories.has(category)) return "vehicules";
      return "jouets";
    };

    const newProducts = deduplicatedResults.filter((product) => String(product.badge || "") === "new");
    const otherProducts = deduplicatedResults.filter((product) => String(product.badge || "") !== "new");
    const buckets = new Map<string, Record<string, unknown>[]>();
    for (const product of newProducts) {
      const group = noveltyGroup(product);
      const bucket = buckets.get(group) || [];
      bucket.push(product);
      buckets.set(group, bucket);
    }
    const groupOrder = ["jouets", "vehicules", "poupees", "enfants", "scolaire"];
    const diversifiedNewProducts: Record<string, unknown>[] = [];
    let remaining = true;
    while (remaining) {
      remaining = false;
      for (const group of groupOrder) {
        const bucket = buckets.get(group);
        if (!bucket?.length) continue;
        diversifiedNewProducts.push(bucket.shift()!);
        remaining = true;
      }
    }

    const orderedResults = [...diversifiedNewProducts, ...otherProducts];
    const products = orderedResults.map(categorizedMamaProduct).map(withVerifiedConakryPrice).map((product) => {
      const stock = Number(product[`stock_${region}`] || 0);
      const regularPrice = Number(product[`price_${region}`] ?? (region === "conakry" ? product.price : 0));
      const promotionalPrice = Number(product[`promo_price_${region}`] || 0);
      return { ...product, price: promotionalPrice > 0 && promotionalPrice < regularPrice ? promotionalPrice : regularPrice, stock, status: stock <= 0 ? "sold" : product.status === "sold" ? "available" : product.status, currency: region === "qc" ? "CAD" : "GNF" };
    });
    return Response.json({ products, settings: marketSettings(allSettings, region), promotions: promotions.results, region, detectedRegion });
  } catch {
    return Response.json({ products: [], settings: {}, promotions: [], region: "conakry", detectedRegion: "conakry" });
  }
}
