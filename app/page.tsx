import "./homepage-only.css";
import { cmsEnv } from "@/lib/cms";
import type { Product } from "@/lib/default-catalog";
import Home from "./storefront/storefront-page";

export const dynamic = "force-dynamic";

function parseImages(value: unknown): string[] {
  try {
    const images = JSON.parse(String(value || "[]"));
    return Array.isArray(images)
      ? images.filter((image): image is string => typeof image === "string" && image.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function mapInitialProduct(item: Record<string, unknown>): Product {
  const stock = Number(item.stock_qc || 0);
  const regularPrice = Number(item.price_qc ?? item.price ?? 0);
  const promotionalPrice = Number(item.promo_price_qc || 0);
  const price = promotionalPrice > 0 && promotionalPrice < regularPrice ? promotionalPrice : regularPrice;
  const rawStatus = String(item.status || "available");

  return {
    id: String(item.id),
    articleNumber: item.article_number ? String(item.article_number) : undefined,
    name: { fr: String(item.name_fr || ""), en: String(item.name_en || item.name_fr || "") },
    category: String(item.category || ""),
    price,
    ages: String(item.ages || "3+"),
    sheet: String(item.image_sheet || "17"),
    position: Number(item.image_position || 0),
    imageUrl: item.image_url ? String(item.image_url) : undefined,
    extraImages: parseImages(item.images_json),
    stock,
    status: stock <= 0 ? "sold" : rawStatus === "sold" ? "available" : rawStatus as Product["status"],
    badge: item.badge ? String(item.badge) as Product["badge"] : undefined,
    detail: {
      fr: String(item.description_fr || ""),
      en: String(item.description_en || item.description_fr || ""),
    },
    brand: item.brand ? String(item.brand) : undefined,
  };
}

async function loadInitialProducts(): Promise<Product[]> {
  try {
    const { results } = await cmsEnv().DB
      .prepare("SELECT * FROM products WHERE visible_qc=1 AND badge IN ('new','school') ORDER BY featured DESC,updated_at DESC")
      .all<Record<string, unknown>>();

    const newest = results.filter((item) => String(item.badge || "") === "new").slice(0, 4);
    const school = results.filter((item) => String(item.badge || "") === "school").slice(0, 4);
    return [...newest, ...school].map(mapInitialProduct);
  } catch {
    return [];
  }
}

export default async function Page() {
  const initialProducts = await loadInitialProducts();
  return <Home initialProducts={initialProducts} />;
}
