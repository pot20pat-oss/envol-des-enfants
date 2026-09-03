-- Une catégorie par marque : les accessoires restent avec les poupées associées.
UPDATE products
SET category = CASE
  WHEN category IN ('disney', 'barbie') THEN category
  WHEN brand = 'My Life As' THEN 'mylife'
  WHEN brand = 'Miraculous' THEN 'miraculous'
  WHEN brand IN ('LOL Surprise', 'LOL OMG') THEN 'lol'
  WHEN brand IN ('Rainbow High', 'Shadow High') THEN 'rainbowhigh'
  WHEN brand = 'Baby Alive' THEN 'babyalive'
  WHEN brand = 'Hairmazing' THEN 'hairmazing'
  WHEN brand = 'Karma''s World' THEN 'karma'
  WHEN brand = 'My Sweet Baby' THEN 'mysweetbaby'
  WHEN brand = 'Glamour Girl' THEN 'glamourgirl'
  ELSE 'autres_poupees'
END,
updated_at = CURRENT_TIMESTAMP
WHERE id LIKE 'mama-%';

-- Le fichier WebP de Rena Rouge est vide; la version JPEG est valide.
UPDATE products
SET image_url = '/products/poupees-mama/mama-16.jpg',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'mama-16';
