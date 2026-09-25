import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://envoldesenfants.com";
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/catalogue`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/jouets`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${base}/poupees`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${base}/articles-scolaires`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/bebe-enfants`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];
}
