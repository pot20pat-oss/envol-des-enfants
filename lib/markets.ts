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

export function marketSettings(settings: Record<string, string>, market: Market): Record<string, string> {
  const output: Record<string, string> = { catalog_initialized: settings.catalog_initialized || "" };
  for (const [key, value] of Object.entries(settings)) {
    if (key.startsWith(`${market}_`)) output[key.slice(market.length + 1)] = value;
    else if (!key.startsWith("qc_") && !key.startsWith("conakry_") && market === "conakry" && output[key] === undefined) output[key] = value;
  }
  return output;
}
