const CATEGORY_PREFIXES: Record<string, string> = {
  barbie: "BAR",
  disney: "DIS",
  princesses: "DIS",
  poupees: "POU",
  eveil: "EDU",
  bebe: "BEB",
  vetements: "VET",
  chaussures: "CHA",
  scolaire: "SCO",
  sacs: "SAC",
  vehicules: "VEH",
  piscine: "PIS",
  imitation: "IMI",
  dinosaures: "DIN",
  animaux: "ANI",
};

export function articlePrefix(category: string) {
  return CATEGORY_PREFIXES[category] || "ART";
}

export async function createArticleNumberGenerator(database: D1Database) {
  const { results } = await database.prepare(
    "SELECT category, article_number FROM products WHERE article_number IS NOT NULL AND TRIM(article_number) <> ''",
  ).all<{ category: string; article_number: string }>();

  const nextByPrefix = new Map<string, number>();

  for (const product of results) {
    const prefix = articlePrefix(product.category);
    // Read both the current BAR0001 format and legacy BAR-00001 values.
    // New numbers keep the compact format while continuing after either one.
    const match = product.article_number.trim().toUpperCase().match(/^([A-Z]{3})-?(\d{4,})$/);
    if (!match || match[1] !== prefix) continue;
    const number = Number(match[2]);
    if (!Number.isFinite(number)) continue;
    nextByPrefix.set(prefix, Math.max(nextByPrefix.get(prefix) || 0, number));
  }

  return (category: string) => {
    const prefix = articlePrefix(category);
    const next = (nextByPrefix.get(prefix) || 0) + 1;
    nextByPrefix.set(prefix, next);
    return `${prefix}${String(next).padStart(4, "0")}`;
  };
}
