import categoryPrefixes from "../data/category-prefixes.json";

const CATEGORY_PREFIXES: Record<string, string> = categoryPrefixes;

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
  const result = await database.prepare(
    "SELECT category, article_number FROM products WHERE article_number IS NOT NULL AND TRIM(article_number) <> ''",
  ).all<{ category: string; article_number: string }>();

  const maxByPrefix = new Map<string, number>();

  for (const product of result.results || []) {
    // Le numéro d'article est UNIQUE globalement. Des fiches historiques peuvent avoir
    // changé de catégorie tout en conservant leur ancien préfixe (ex. EVE-0061 devenu Barbie).
    // On réserve donc chaque numéro d'après son préfixe réel, indépendamment de la catégorie actuelle.
    const match = String(product.article_number || "").trim().toUpperCase().match(/^([A-Z0-9]{3})(-?)(\d{1,6})$/);
    if (!match) continue;

    const prefix = match[1];
    // Les anciens numéros sans tiret sont limités au format historique sur 4 chiffres.
    // Cela évite qu’une valeur ambiguë comme DIS9999 portée par une autre catégorie
    // fasse bondir artificiellement la séquence DIS actuelle.
    if (!match[2] && match[3].length > 4) continue;
    if (articlePrefix(product.category) !== prefix && !match[2]) continue;
    const number = Number(match[3]);
    if (!Number.isFinite(number)) continue;
    maxByPrefix.set(prefix, Math.max(maxByPrefix.get(prefix) || 0, number));
  }

  return (category: string) => {
    const prefix = articlePrefix(category);
    const next = (maxByPrefix.get(prefix) || 0) + 1;
    maxByPrefix.set(prefix, next);
    return `${prefix}-${String(next).padStart(4, "0")}`;
  };
}
