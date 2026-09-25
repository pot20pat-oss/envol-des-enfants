import categoryPrefixes from "../data/category-prefixes.json";

const CATEGORY_PREFIXES: Record<string, string> = categoryPrefixes;

let articleNumberGeneratorCache: ReturnType<typeof createArticleNumberGenerator> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function articlePrefix(category: string) {
  const key = String(category || "").trim().toLowerCase();
  if (CATEGORY_PREFIXES[key]) return CATEGORY_PREFIXES[key];

  const normalized = key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .toUpperCase();

  return (normalized.slice(0, 3) || "ART").padEnd(3, "X");
}

export async function createArticleNumberGenerator(database: D1Database) {
  // Return cached generator if still valid
  const now = Date.now();
  if (articleNumberGeneratorCache && now - cacheTimestamp < CACHE_TTL) {
    return articleNumberGeneratorCache;
  }

  const result = await database.prepare(
    "SELECT category, article_number FROM products WHERE article_number IS NOT NULL AND TRIM(article_number) <> ''",
  ).all<{ category: string; article_number: string }>();

  const maxByPrefix = new Map<string, number>();

  for (const product of result.results || []) {
    const match = String(product.article_number || "").trim().toUpperCase().match(/^([A-Z0-9]{3})(-?)(\d{1,6})$/);
    if (!match) continue;

    const prefix = match[1];
    if (!match[2] && match[3].length > 4) continue;
    if (articlePrefix(product.category) !== prefix && !match[2]) continue;
    const number = Number(match[3]);
    if (!Number.isFinite(number)) continue;
    maxByPrefix.set(prefix, Math.max(maxByPrefix.get(prefix) || 0, number));
  }

  const generator = (category: string) => {
    const prefix = articlePrefix(category);
    const next = (maxByPrefix.get(prefix) || 0) + 1;
    maxByPrefix.set(prefix, next);
    return `${prefix}-${String(next).padStart(4, "0")}`;
  };

  // Cache the generator
  articleNumberGeneratorCache = generator;
  cacheTimestamp = Date.now();

  return generator;
}