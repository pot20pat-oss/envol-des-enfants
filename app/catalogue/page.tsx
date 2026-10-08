import type { Metadata } from "next";
import CategoryStorefront from "../category-storefront";
import { GET as getCatalog } from "../api/catalog/route";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Catalogue de jouets pour enfants | L’Envol des Enfants",
  description: "Parcourez le catalogue de L’Envol des Enfants : jouets éducatifs, poupées, articles pour bébé, véhicules, plein air et articles scolaires.",
  alternates: { canonical: "/catalogue" },
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
    title="Catalogue"
    subtitle="Tous les articles disponibles dans votre boutique."
    initialProducts={Array.isArray(catalog.products) ? catalog.products as any : []}
    initialMarket={catalog.region === "qc" ? "qc" : "conakry"}
  />;
}
