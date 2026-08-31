-- Chaque catégorie possède sa propre séquence, à partir de 0001.
-- Exemples : BAR0001, BAR0002, DIS0001, VEH0001.

-- Évite les collisions avec l'index UNIQUE pendant la renumérotation.
UPDATE products
SET article_number = 'TMP-' || id;

WITH ranked AS (
  SELECT
    id,
    (
      CASE category
        WHEN 'barbie' THEN 'BAR'
        WHEN 'disney' THEN 'DIS'
        WHEN 'princesses' THEN 'DIS'
        WHEN 'poupees' THEN 'POU'
        WHEN 'eveil' THEN 'EDU'
        WHEN 'bebe' THEN 'BEB'
        WHEN 'vetements' THEN 'VET'
        WHEN 'chaussures' THEN 'CHA'
        WHEN 'scolaire' THEN 'SCO'
        WHEN 'sacs' THEN 'SAC'
        WHEN 'vehicules' THEN 'VEH'
        WHEN 'piscine' THEN 'PIS'
        WHEN 'imitation' THEN 'IMI'
        WHEN 'dinosaures' THEN 'DIN'
        WHEN 'animaux' THEN 'ANI'
        ELSE 'ART'
      END
      || printf('%04d', ROW_NUMBER() OVER (
        PARTITION BY
          CASE category
            WHEN 'princesses' THEN 'disney'
            ELSE category
          END
        ORDER BY created_at, id
      ))
    ) AS new_article_number
  FROM products
)
UPDATE products
SET article_number = (
  SELECT ranked.new_article_number
  FROM ranked
  WHERE ranked.id = products.id
);
