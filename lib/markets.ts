export type Market = "conakry" | "qc";

export const markets = {
  conakry: { label: "Conakry", currency: "GNF", locale: "fr-GN", timeZone: "Africa/Conakry" },
  qc: { label: "Québec", currency: "CAD", locale: "fr-CA", timeZone: "America/Toronto" },
} as const;

export function normalizeMarket(value: unknown): Market {
  return value === "qc" ? "qc" : "conakry";
}

export function marketPrice(value: unknown, market: Market, language = "fr"): string {
  const amount = Number(value || 0);
  if (amount <= 0) return language === "en" ? "Price to be confirmed" : "Prix à confirmer";
  if (market === "qc") return new Intl.NumberFormat(language === "en" ? "en-CA" : "fr-CA", { style: "currency", currency: "CAD" }).format(amount / 100);
  return `${new Intl.NumberFormat(language === "en" ? "en-CA" : "fr-GN").format(amount)} GNF`;
}

function promotionSectionVisible(value?: string): boolean | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    const promotion = parsed.find((item) => item && typeof item === "object" && (item as { id?: unknown }).id === "promotions") as { visible?: unknown } | undefined;
    if (!promotion) return null;
    return promotion.visible !== false;
  } catch {
    return null;
  }
}

function forcePromotionVisibility(value: string | undefined, visible: boolean): string | undefined {
  if (!value) return value;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return value;
    const updated = parsed.map((item) => item && typeof item === "object" && (item as { id?: unknown }).id === "promotions" ? { ...(item as Record<string, unknown>), visible } : item);
    return JSON.stringify(updated);
  } catch {
    return value;
  }
}

export function marketSettings(settings: Record<string, string>, market: Market): Record<string, string> {
  const output: Record<string, string> = { catalog_initialized: settings.catalog_initialized || "" };
  for (const [key, value] of Object.entries(settings)) {
    if (key.startsWith(`${market}_`)) output[key.slice(market.length + 1)] = value;
    else if (!key.startsWith("qc_") && !key.startsWith("conakry_") && market === "conakry" && output[key] === undefined) output[key] = value;
  }

  // La visibilité du bouton Promotions est commune aux deux vitrines.
  // Si le CMS l'active dans l'une des boutiques, le bouton doit apparaître partout.
  const qcPromo = promotionSectionVisible(settings.qc_site_sections);
  const conakryPromo = promotionSectionVisible(settings.conakry_site_sections || settings.site_sections);
  const globalPromoVisible = qcPromo === true || conakryPromo === true;
  if (output.site_sections && (qcPromo !== null || conakryPromo !== null)) {
    output.site_sections = forcePromotionVisibility(output.site_sections, globalPromoVisible) || output.site_sections;
  }

  return output;
}
