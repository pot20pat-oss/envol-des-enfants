-- Prix vérifiés dans le catalogue public jouetseducatifs.online (GNF).
-- Seules les correspondances certaines par produit, emballage ou gamme sont mises à jour.
UPDATE products
SET price_conakry = CASE
  WHEN image_url GLOB '/products/barbie/barbie-0[2-9].webp'
    OR image_url GLOB '/products/barbie/barbie-1[0-9].webp'
    OR image_url = '/products/barbie/barbie-20.webp' THEN 150000
  WHEN image_url IN ('/products/disney/disney-01.webp','/products/disney/disney-02.webp') THEN 460000
  WHEN image_url GLOB '/products/disney/disney-1[2-8].webp' THEN 285000
  WHEN id IN ('mama-05','mama-14','mama-22','mama-28','mama-36','mama-50') THEN 485000
  WHEN id = 'mama-06' THEN 321000
  WHEN id IN ('mama-13','mama-43') THEN 600000
  WHEN id IN ('mama-16','mama-51') THEN 460000
  WHEN id IN ('mama-23','mama-40','mama-44') THEN 1199800
  WHEN id = 'mama-33' THEN 725000
  WHEN id = 'mama-39' THEN 485000
  WHEN id = 'mama-41' THEN 600000
  WHEN id = 'mama-62' THEN 400000
  ELSE price_conakry
END,
price = CASE
  WHEN image_url GLOB '/products/barbie/barbie-0[2-9].webp'
    OR image_url GLOB '/products/barbie/barbie-1[0-9].webp'
    OR image_url = '/products/barbie/barbie-20.webp' THEN 150000
  WHEN image_url IN ('/products/disney/disney-01.webp','/products/disney/disney-02.webp') THEN 460000
  WHEN image_url GLOB '/products/disney/disney-1[2-8].webp' THEN 285000
  WHEN id IN ('mama-05','mama-14','mama-22','mama-28','mama-36','mama-50') THEN 485000
  WHEN id = 'mama-06' THEN 321000
  WHEN id IN ('mama-13','mama-43') THEN 600000
  WHEN id IN ('mama-16','mama-51') THEN 460000
  WHEN id IN ('mama-23','mama-40','mama-44') THEN 1199800
  WHEN id = 'mama-33' THEN 725000
  WHEN id = 'mama-39' THEN 485000
  WHEN id = 'mama-41' THEN 600000
  WHEN id = 'mama-62' THEN 400000
  ELSE price
END,
updated_at = CURRENT_TIMESTAMP
WHERE image_url GLOB '/products/barbie/barbie-0[2-9].webp'
   OR image_url GLOB '/products/barbie/barbie-1[0-9].webp'
   OR image_url = '/products/barbie/barbie-20.webp'
   OR image_url IN ('/products/disney/disney-01.webp','/products/disney/disney-02.webp')
   OR image_url GLOB '/products/disney/disney-1[2-8].webp'
   OR id IN (
     'mama-05','mama-06','mama-13','mama-14','mama-16','mama-22','mama-23',
     'mama-28','mama-33','mama-36','mama-39','mama-40','mama-41','mama-43',
     'mama-44','mama-50','mama-51','mama-62'
   );
