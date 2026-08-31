export async function createArticleNumberGenerator(database: D1Database) {
  const row = await database.prepare(
    "SELECT COALESCE(MAX(CASE WHEN article_number GLOB '[0-9]*' AND article_number NOT GLOB '*[^0-9]*' THEN CAST(article_number AS INTEGER) ELSE 0 END), 0) AS max_number FROM products",
  ).first<{ max_number: number }>();
  let next = Number(row?.max_number || 0) + 1;
  return () => String(next++);
}
