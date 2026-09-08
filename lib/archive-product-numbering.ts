import { articlePrefix } from "./article-number.ts";

type ArticleNumberRow = {
  id: string;
  category: string;
  article_number: string | null;
};

type ArticleNumberCandidate = {
  id: string;
  category: string;
};

type ArticleNumberAssignment = ArticleNumberCandidate & {
  articleNumber: string;
};

export function collectCategoryArticleNumberState(rows: ArticleNumberRow[]) {
  const maxByPrefix = new Map<string, number>();
  const needsNumber: ArticleNumberCandidate[] = [];

  for (const product of rows) {
    const prefix = articlePrefix(product.category);
    const current = String(product.article_number || "").trim().toUpperCase();
    const match = current.match(/^([A-Z0-9]{3})-(\d{4,6})$/);

    if (match && match[1] === prefix) {
      maxByPrefix.set(prefix, Math.max(maxByPrefix.get(prefix) || 0, Number(match[2])));
      continue;
    }

    needsNumber.push({ id: product.id, category: product.category });
  }

  return { maxByPrefix, needsNumber };
}

export function assignCategoryArticleNumbers(
  needsNumber: ArticleNumberCandidate[],
  currentMaxByPrefix: Map<string, number>,
): ArticleNumberAssignment[] {
  const maxByPrefix = new Map(currentMaxByPrefix);

  return needsNumber.map((product) => {
    const prefix = articlePrefix(product.category);
    const next = (maxByPrefix.get(prefix) || 0) + 1;
    maxByPrefix.set(prefix, next);

    return {
      ...product,
      articleNumber: `${prefix}-${String(next).padStart(4, "0")}`,
    };
  });
}

export async function ensureCategoryArticleNumbers(database: D1Database, now: string) {
  const { results } = await database.prepare(
    "SELECT id,category,article_number FROM products ORDER BY created_at,id",
  ).all<ArticleNumberRow>();

  const { maxByPrefix, needsNumber } = collectCategoryArticleNumberState(results || []);
  if (!needsNumber.length) return;

  const assignments = assignCategoryArticleNumbers(needsNumber, maxByPrefix);

  const clearStatements = needsNumber.map((product) => database.prepare(
    "UPDATE products SET article_number=NULL WHERE id=?",
  ).bind(product.id));
  await database.batch(clearStatements);

  const updateStatements = assignments.map((product) => database.prepare(
    "UPDATE products SET article_number=?,updated_at=? WHERE id=?",
  ).bind(product.articleNumber, now, product.id));

  await database.batch(updateStatements);
}
