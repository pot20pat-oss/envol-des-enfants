import type { Metadata } from "next";
import { headers } from "next/headers";
import CategoryStorefront from "../category-storefront";
import { GET as getCatalog } from "../api/catalog/route";

export const metadata: Metadata = {
  title: "Articles pour bébé et enfants | L’Envol des Enfants",
  description: "Découvrez notre sélection d’articles pour bébé, vêtements et chaussures pour enfants.",
  alternates: { canonical: "/bebe-enfants" },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ region?: string }> }) {
  const params = await searchParams;
  const requestHeaders = await headers();
  const region = params.region === "qc" || params.region === "conakry" ? params.region : undefined;
  const catalogUrl = new URL("https://envoldesenfants.com/api/catalog");
  if (region) catalogUrl.searchParams.set("region", region);
  const country = requestHeaders.get("cf-ipcountry");
  const response = await getCatalog(new Request(catalogUrl, {
    headers: country ? { "cf-ipcountry": country } : {},
  }));
  const catalog = await response.json() as {
    products?: Record<string, unknown>[];
    region?: "qc" | "conakry";
  };
  return <CategoryStorefront
    title="Bébé & enfants"
    subtitle="Articles pour bébé, vêtements et chaussures pour enfants."
    categories={["bebe", "vetements", "chaussures"]}
    initialProducts={Array.isArray(catalog.products) ? catalog.products as any : []}
    initialMarket={catalog.region === "qc" ? "qc" : "conakry"}
  />;
}
