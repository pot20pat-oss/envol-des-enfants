-- Remove duplicate product rows by normalized French name.
-- Prefer the row that has an image, then the most recently updated row.
WITH ranked AS (
  SELECT
    rowid AS rid,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(name_fr))
      ORDER BY
        CASE WHEN image_url IS NOT NULL AND TRIM(image_url) <> '' THEN 1 ELSE 0 END DESC,
        COALESCE(updated_at, created_at, '') DESC,
        rowid DESC
    ) AS rn
  FROM products
  WHERE TRIM(COALESCE(name_fr, '')) <> ''
)
DELETE FROM products
WHERE rowid IN (SELECT rid FROM ranked WHERE rn > 1);

-- Rebuild article codes as a clean numeric sequence starting at 1.
UPDATE products SET article_number = NULL;
WITH numbered AS (
  SELECT
    rowid AS rid,
    ROW_NUMBER() OVER (
      ORDER BY COALESCE(created_at, updated_at, ''), rowid
    ) AS rn
  FROM products
)
UPDATE products
SET article_number = CAST((SELECT rn FROM numbered WHERE numbered.rid = products.rowid) AS TEXT);

CREATE UNIQUE INDEX IF NOT EXISTS products_article_number_unique
ON products(article_number);
