UPDATE products
SET article_number = 'TMP-' || id;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at, id) AS new_article_number
  FROM products
)
UPDATE products
SET article_number = CAST((
  SELECT new_article_number
  FROM ranked
  WHERE ranked.id = products.id
) AS TEXT);
