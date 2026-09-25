import { cmsEnv } from "@/lib/cms";

const BASE = "https://envoldesenfants.com";
const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export async function GET() {
  const now = new Date().toISOString();
  const urls: { loc: string; lastmod: string; changefreq: string; priority: string }[] = [
    { loc: BASE, lastmod: now, changefreq: "daily", priority: "1.0" },
    { loc: `${BASE}/catalogue`, lastmod: now, changefreq: "daily", priority: "0.9" },
    { loc: `${BASE}/jouets`, lastmod: now, changefreq: "daily", priority: "0.85" },
    { loc: `${BASE}/poupees`, lastmod: now, changefreq: "daily", priority: "0.85" },
    { loc: `${BASE}/articles-scolaires`, lastmod: now, changefreq: "weekly", priority: "0.8" },
    { loc: `${BASE}/bebe-enfants`, lastmod: now, changefreq: "weekly", priority: "0.8" },
  ];
  try {
    const { results } = await cmsEnv().DB.prepare("SELECT id,updated_at FROM products WHERE visible_qc=1 OR visible_conakry=1 ORDER BY updated_at DESC").all<{ id: string; updated_at?: string }>();
    for (const product of results) urls.push({ loc: `${BASE}/produit/${encodeURIComponent(product.id)}`, lastmod: product.updated_at ? new Date(product.updated_at).toISOString() : now, changefreq: "weekly", priority: "0.7" });
  } catch (error) { console.error("sitemap products", error); }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${escapeXml(u.loc)}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
