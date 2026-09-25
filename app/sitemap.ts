import type { MetadataRoute } from "next";
import { cmsEnv } from "@/lib/cms";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://envoldesenfants.com";
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/catalogue`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/jouets`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${base}/poupees`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${base}/articles-scolaires`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/bebe-enfants`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];
  try {
    const {results}=await cmsEnv().DB.prepare("SELECT id,updated_at FROM products WHERE visible_qc=1 OR visible_conakry=1 ORDER BY updated_at DESC").all<{id:string;updated_at?:string}>();
    return [...staticPages,...results.map(product=>({url:`${base}/produit/${encodeURIComponent(product.id)}`,lastModified:product.updated_at?new Date(product.updated_at):now,changeFrequency:"weekly" as const,priority:0.7}))];
  } catch { return staticPages; }
}
