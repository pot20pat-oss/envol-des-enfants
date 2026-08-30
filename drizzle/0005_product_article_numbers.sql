ALTER TABLE products ADD COLUMN article_number TEXT;

UPDATE products
SET article_number =
  CASE category
    WHEN 'eveil' THEN 'EDU' WHEN 'poupees' THEN 'POU' WHEN 'disney' THEN 'DIS'
    WHEN 'barbie' THEN 'BAR' WHEN 'piscine' THEN 'PIS' WHEN 'imitation' THEN 'MET'
    WHEN 'dinosaures' THEN 'DIN' WHEN 'animaux' THEN 'ANI' WHEN 'bebe' THEN 'BEB'
    WHEN 'vetements' THEN 'VET' WHEN 'chaussures' THEN 'CHA' WHEN 'scolaire' THEN 'SCO'
    WHEN 'sacs' THEN 'SAC' WHEN 'vehicules' THEN 'VEH' ELSE 'ART'
  END || '-' || UPPER(SUBSTR(REPLACE(id, '-', ''), 1, 5))
WHERE article_number IS NULL OR TRIM(article_number) = '';

CREATE UNIQUE INDEX IF NOT EXISTS products_article_number_unique
ON products(article_number);
