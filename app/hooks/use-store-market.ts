"use client";

import { useEffect, useState } from "react";
import { defaultProducts, type Product } from "@/lib/default-catalog";
import { normalizeMarket, type Market } from "@/lib/markets";

function mapCatalogProduct(item: Record<string, unknown>): Product {
  return {
    id: String(item.id),
    articleNumber: item.article_number ? String(item.article_number) : undefined,
    name: { fr: String(item.name_fr || ""), en: String(item.name_en || item.name_fr || "") },
    category: String(item.category),
    price: Number(item.price || 0),
    ages: String(item.ages || "3+"),
    sheet: String(item.image_sheet || "17"),
    position: Number(item.image_position || 0),
    imageUrl: item.image_url ? String(item.image_url) : undefined,
    extraImages: (() => {
      try {
        const images = JSON.parse(String(item.images_json || "[]"));
        return Array.isArray(images)
          ? images.filter((image): image is string => typeof image === "string" && image.trim().length > 0)
          : [];
      } catch {
        return [];
      }
    })(),
    stock: Number(item.stock || 0),
    status: String(item.status || "available") as Product["status"],
    badge: item.badge ? String(item.badge) as Product["badge"] : undefined,
    detail: { fr: String(item.description_fr || ""), en: String(item.description_en || item.description_fr || "") },
  };
}

export function useStoreMarket() {
  const [managedProducts, setManagedProducts] = useState<Product[] | null>(null);
  const [storeSettings, setStoreSettings] = useState<Record<string, string>>({});
  const [market, setMarket] = useState<Market>("conakry");

  useEffect(() => {
    const queryMarket = new URLSearchParams(window.location.search).get("region");
    const savedMarket = window.localStorage.getItem("envol-market");
    const preferred = queryMarket === "qc" || queryMarket === "conakry"
      ? queryMarket
      : savedMarket === "qc" || savedMarket === "conakry"
        ? savedMarket
        : undefined;
    void loadMarket(preferred);
  }, []);

  async function loadMarket(preferred?: Market) {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch(
        preferred
          ? `/api/catalog?region=${preferred}&timezone=${encodeURIComponent(timezone)}`
          : `/api/catalog?timezone=${encodeURIComponent(timezone)}`
      );
      const payload = await response.json() as {
        products?: Record<string, unknown>[];
        settings?: Record<string, string>;
        region?: string;
      };
      const selected = normalizeMarket(payload.region || preferred);
      const savedSettings = payload.settings || {};
      window.localStorage.setItem("envol-market", selected);
      setMarket(selected);
      setStoreSettings(savedSettings);
      if (!payload.products?.length && savedSettings.catalog_initialized !== "true" && selected === "conakry") return;
      setManagedProducts((payload.products || []).map(mapCatalogProduct));
    } catch {}
  }

  const storeProducts = managedProducts === null
    ? market === "conakry" ? defaultProducts : []
    : managedProducts;

  return { market, storeSettings, storeProducts };
}
