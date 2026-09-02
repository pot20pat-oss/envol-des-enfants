-- Répartit les articles mama dans les sous-catégories visibles du catalogue.
UPDATE products
SET category = CASE
  WHEN category IN ('disney', 'barbie') THEN category
  WHEN brand = 'My Life As' THEN 'mylife'
  WHEN brand = 'Miraculous' THEN 'miraculous'
  WHEN brand IN ('LOL Surprise', 'LOL OMG') THEN 'lol'
  WHEN brand IN ('Rainbow High', 'Shadow High') THEN 'rainbowhigh'
  WHEN brand = 'Baby Alive' THEN 'babyalive'
  WHEN name_fr LIKE '%accessoires%'
    OR name_fr LIKE '%ensemble de bain%'
    OR name_fr LIKE '%ensemble coiffure%'
    OR name_fr LIKE '%ensemble épicerie%'
    THEN 'accessoires_poupees'
  ELSE 'autres_poupees'
END,
updated_at = CURRENT_TIMESTAMP
WHERE id LIKE 'mama-%';
