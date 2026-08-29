WITH disney(id, name_fr, name_en, description_fr, description_en, image_url) AS (
  VALUES
    ('seed-disney-01', 'Disney Raiponce · coiffure deluxe', 'Disney Rapunzel · deluxe styling', 'Poupée Raiponce avec accessoires de coiffure.', 'Rapunzel doll with styling accessories.', '/products/disney/disney-01.webp'),
    ('seed-disney-02', 'Disney Raiponce · ensemble coiffure', 'Disney Rapunzel · styling set', 'Poupée Raiponce et ses accessoires.', 'Rapunzel doll and accessories.', '/products/disney/disney-02.webp'),
    ('seed-disney-03', 'Disney Elsa · ensemble coiffure', 'Disney Elsa · styling set', 'Poupée Elsa avec accessoires inspirés de La Reine des neiges.', 'Elsa doll with Frozen-inspired accessories.', '/products/disney/disney-03.webp'),
    ('seed-disney-04', 'Disney Belle · ensemble coiffure', 'Disney Belle · styling set', 'Poupée Belle avec accessoires de coiffure.', 'Belle doll with styling accessories.', '/products/disney/disney-04.webp'),
    ('seed-disney-05', 'Disney Moana · ensemble coiffure', 'Disney Moana · styling set', 'Poupée Moana avec accessoires de coiffure.', 'Moana doll with styling accessories.', '/products/disney/disney-05.webp'),
    ('seed-disney-06', 'Disney Ariel · robe sirène', 'Disney Ariel · mermaid dress', 'Poupée Ariel en robe de sirène.', 'Ariel doll in a mermaid dress.', '/products/disney/disney-06.webp'),
    ('seed-disney-07', 'Disney Cendrillon · tenue bleue', 'Disney Cinderella · blue outfit', 'Poupée Cendrillon dans une tenue bleue.', 'Cinderella doll in a blue outfit.', '/products/disney/disney-07.webp'),
    ('seed-disney-08', 'Disney Ariel · ensemble coiffure', 'Disney Ariel · styling set', 'Poupée Ariel avec accessoires sur le thème marin.', 'Ariel doll with sea-themed accessories.', '/products/disney/disney-08.webp'),
    ('seed-disney-09', 'Disney Raya · aventure', 'Disney Raya · adventure', 'Poupée Raya en tenue d''aventure.', 'Raya doll in her adventure outfit.', '/products/disney/disney-09.webp'),
    ('seed-disney-10', 'Disney Raiponce · robe violette', 'Disney Rapunzel · purple dress', 'Poupée Raiponce en robe violette.', 'Rapunzel doll in a purple dress.', '/products/disney/disney-10.webp'),
    ('seed-disney-11', 'Disney Moana · tenue d''aventure', 'Disney Moana · adventure outfit', 'Poupée Moana dans sa tenue d''aventure.', 'Moana doll in her adventure outfit.', '/products/disney/disney-11.webp'),
    ('seed-disney-12', 'Disney Aurore · robe rose', 'Disney Aurora · pink dress', 'Poupée Aurore dans sa robe rose.', 'Aurora doll in her pink dress.', '/products/disney/disney-12.webp'),
    ('seed-disney-13', 'Disney Mulan · tenue rose', 'Disney Mulan · pink outfit', 'Poupée Mulan en tenue rose royale.', 'Mulan doll in a royal pink outfit.', '/products/disney/disney-13.webp'),
    ('seed-disney-14', 'Disney Belle · robe dorée', 'Disney Belle · golden dress', 'Poupée Belle en robe dorée.', 'Belle doll in a golden dress.', '/products/disney/disney-14.webp'),
    ('seed-disney-15', 'Disney Raiponce · classique', 'Disney Rapunzel · classic', 'Poupée Raiponce classique en robe violette.', 'Classic Rapunzel doll in purple.', '/products/disney/disney-15.webp'),
    ('seed-disney-16', 'Disney Tiana · robe verte', 'Disney Tiana · green dress', 'Poupée Tiana en robe verte.', 'Tiana doll in a green dress.', '/products/disney/disney-16.webp'),
    ('seed-disney-17', 'Disney Ariel · classique', 'Disney Ariel · classic', 'Poupée Ariel classique en tenue turquoise.', 'Classic Ariel doll in turquoise.', '/products/disney/disney-17.webp'),
    ('seed-disney-18', 'Disney Mulan · classique', 'Disney Mulan · classic', 'Poupée Mulan classique.', 'Classic Mulan doll.', '/products/disney/disney-18.webp')
)
INSERT INTO products (
  id, name_fr, name_en, description_fr, description_en, category, price, stock,
  status, badge, ages, image_url, visible, price_qc, price_conakry, stock_qc,
  stock_conakry, visible_qc, visible_conakry, alert_threshold, featured,
  variants_json, images_json, created_at, updated_at
)
SELECT
  disney.id, disney.name_fr, disney.name_en, disney.description_fr,
  disney.description_en, 'disney', 0, 1, 'available', 'new', '3+',
  disney.image_url, 1, 0, 0, 1, 1, 1, 1, 2, 0, '[]', '[]',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM disney
WHERE NOT EXISTS (SELECT 1 FROM products WHERE products.name_fr = disney.name_fr);
