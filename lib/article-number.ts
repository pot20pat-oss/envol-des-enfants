export async function createArticleNumberGenerator(database: D1Database) {
  const result = await database.prepare(
    "SELECT COALESCE(MAX(CAST(article_number AS INTEGER)), 0) AS max_number FROM products WHERE article_number IS NOT NULL AND TRIM(article_number) <> ''",
  ).first<{ max_number: number }>();

  let nextNumber = Number(result?.max_number || 0);

  return (_category: string) => {
    nextNumber += 1;
    return String(nextNumber);
  };
}
