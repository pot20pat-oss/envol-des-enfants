-- Import des 63 poupées, princesses et accessoires de l'archive mama.rar.
WITH arrivals(id,name_fr,name_en,category,brand,image_url) AS (
 VALUES
  ('mama-01','Poupée mode en robe argentée','Fashion doll in silver dress','poupees','Poupée mode','/products/poupees-mama/mama-01.webp'),
  ('mama-02','Poupée Karma''s World · Winston','Karma''s World Winston doll','poupees','Karma''s World','/products/poupees-mama/mama-02.webp'),
  ('mama-03','Disney Moana 2 · ensemble de poupées','Disney Moana 2 doll set','disney','Disney Moana 2','/products/poupees-mama/mama-03.webp'),
  ('mama-04','Disney Moana 2 · poupée d''aventure','Disney Moana 2 adventure doll','disney','Disney Moana 2','/products/poupees-mama/mama-04.webp'),
  ('mama-05','Poupée garçon My Life · tenue sportive','My Life boy doll · sporty outfit','poupees','My Life As','/products/poupees-mama/mama-05.webp'),
  ('mama-06','LOL Surprise Boys · Arcade Heroes','LOL Surprise Boys · Arcade Heroes','poupees','LOL Surprise','/products/poupees-mama/mama-06.webp'),
  ('mama-07','Disney Encanto · poupée Bruno','Disney Encanto Bruno doll','disney','Disney Encanto','/products/poupees-mama/mama-07.webp'),
  ('mama-08','Disney Raya · poupée guerrière','Disney Raya warrior doll','disney','Disney Raya','/products/poupees-mama/mama-08.webp'),
  ('mama-09','Rainbow High · poupée et accessoires','Rainbow High doll and accessories','poupees','Rainbow High','/products/poupees-mama/mama-09.webp'),
  ('mama-10','Miraculous · poupée Chat Noir','Miraculous Cat Noir doll','poupees','Miraculous','/products/poupees-mama/mama-10.webp'),
  ('mama-11','My Life · ensemble de perles arc-en-ciel','My Life rainbow bead set','poupees','My Life As','/products/poupees-mama/mama-11.webp'),
  ('mama-12','My Sweet Baby · accessoires pour poupée','My Sweet Baby doll accessories','poupees','My Sweet Baby','/products/poupees-mama/mama-12.webp'),
  ('mama-13','Hairmazing · poupées Bella et Harmoni','Hairmazing Bella and Harmoni dolls','poupees','Hairmazing','/products/poupees-mama/mama-13.webp'),
  ('mama-14','Poupée My Life · tenue décontractée','My Life doll · casual outfit','poupees','My Life As','/products/poupees-mama/mama-14.webp'),
  ('mama-15','My Life · appareil photo et accessoires','My Life camera and accessories','poupees','My Life As','/products/poupees-mama/mama-15.webp'),
  ('mama-16','Miraculous · poupée Rena Rouge','Miraculous Rena Rouge doll','poupees','Miraculous','/products/poupees-mama/mama-16.webp'),
  ('mama-17','My Life · lunettes cœur et accessoires','My Life heart glasses and accessories','poupees','My Life As','/products/poupees-mama/mama-17.webp'),
  ('mama-18','Miraculous · ensemble de figurines','Miraculous figure set','poupees','Miraculous','/products/poupees-mama/mama-18.webp'),
  ('mama-19','Miraculous · poupée Vesperia','Miraculous Vesperia doll','poupees','Miraculous','/products/poupees-mama/mama-19.webp'),
  ('mama-20','Disney Encanto · poupée Luisa','Disney Encanto Luisa doll','disney','Disney Encanto','/products/poupees-mama/mama-20.webp'),
  ('mama-21','Shadow High · ensemble beauté','Shadow High beauty set','poupees','Shadow High','/products/poupees-mama/mama-21.webp'),
  ('mama-22','Poupée My Life · blonde avec lunettes','My Life blonde doll with glasses','poupees','My Life As','/products/poupees-mama/mama-22.webp'),
  ('mama-23','LOL OMG Remix · poupée Pop B.B.','LOL OMG Remix Pop B.B. doll','poupees','LOL OMG','/products/poupees-mama/mama-23.webp'),
  ('mama-24','Miraculous · duo de figurines','Miraculous two-figure set','poupees','Miraculous','/products/poupees-mama/mama-24.webp'),
  ('mama-25','LOL OMG Fierce · poupée Lady Diva','LOL OMG Fierce Lady Diva doll','poupees','LOL OMG','/products/poupees-mama/mama-25.webp'),
  ('mama-26','Petite poupée bébé','Little baby doll','poupees','Poupée bébé','/products/poupees-mama/mama-26.webp'),
  ('mama-27','Rainbow High Junior · poupée violette','Rainbow High Junior purple doll','poupees','Rainbow High','/products/poupees-mama/mama-27.webp'),
  ('mama-28','Poupée sirène My Life','My Life mermaid doll','poupees','My Life As','/products/poupees-mama/mama-28.webp'),
  ('mama-29','Glamour Girl · poupée princesse','Glamour Girl princess doll','poupees','Glamour Girl','/products/poupees-mama/mama-29.webp'),
  ('mama-30','Baby Alive · ensemble de deux poupées','Baby Alive two-doll set','poupees','Baby Alive','/products/poupees-mama/mama-30.webp'),
  ('mama-31','Rainbow High · poupée en tenue orange','Rainbow High doll in orange outfit','poupees','Rainbow High','/products/poupees-mama/mama-31.webp'),
  ('mama-32','Poupée Baby Alive','Baby Alive doll','poupees','Baby Alive','/products/poupees-mama/mama-32.webp'),
  ('mama-33','Baby Alive · ensemble pâtisserie','Baby Alive baking set','poupees','Baby Alive','/products/poupees-mama/mama-33.webp'),
  ('mama-34','My Life · sac et lunettes de soleil','My Life bag and sunglasses','poupees','My Life As','/products/poupees-mama/mama-34.webp'),
  ('mama-35','Miraculous · trio de figurines','Miraculous three-figure set','poupees','Miraculous','/products/poupees-mama/mama-35.webp'),
  ('mama-36','Poupée bébé My Life · robe rose','My Life baby doll · pink dress','poupees','My Life As','/products/poupees-mama/mama-36.webp'),
  ('mama-37','Disney Encanto · poupée Mirabel','Disney Encanto Mirabel doll','disney','Disney Encanto','/products/poupees-mama/mama-37.webp'),
  ('mama-38','Glamour Girl · princesse blonde','Glamour Girl blonde princess','poupees','Glamour Girl','/products/poupees-mama/mama-38.webp'),
  ('mama-39','Disney Aladdin · poupée Génie','Disney Aladdin Genie doll','disney','Disney Aladdin','/products/poupees-mama/mama-39.webp'),
  ('mama-40','LOL OMG Remix · poupée Lonestar','LOL OMG Remix Lonestar doll','poupees','LOL OMG','/products/poupees-mama/mama-40.webp'),
  ('mama-41','Miraculous · poupée Ladybug','Miraculous Ladybug doll','poupees','Miraculous','/products/poupees-mama/mama-41.webp'),
  ('mama-42','Disney Encanto · poupée Mirabel en robe','Disney Encanto Mirabel dress doll','disney','Disney Encanto','/products/poupees-mama/mama-42.webp'),
  ('mama-43','Hairmazing · poupée Dee Dee','Hairmazing Dee Dee doll','poupees','Hairmazing','/products/poupees-mama/mama-43.webp'),
  ('mama-44','LOL OMG Remix · poupée Kitty K','LOL OMG Remix Kitty K doll','poupees','LOL OMG','/products/poupees-mama/mama-44.webp'),
  ('mama-45','Disney Princesses · ensemble Moana','Disney Princess Moana set','disney','Disney Princess','/products/poupees-mama/mama-45.webp'),
  ('mama-46','Petite poupée Baby Alive','Little Baby Alive doll','poupees','Baby Alive','/products/poupees-mama/mama-46.webp'),
  ('mama-47','LOL OMG Fierce · poupée de mode','LOL OMG Fierce fashion doll','poupees','LOL OMG','/products/poupees-mama/mama-47.webp'),
  ('mama-48','My Sweet Baby · ensemble de bain','My Sweet Baby bath set','poupees','My Sweet Baby','/products/poupees-mama/mama-48.webp'),
  ('mama-49','Rainbow High Pacific Coast · poupée','Rainbow High Pacific Coast doll','poupees','Rainbow High','/products/poupees-mama/mama-49.webp'),
  ('mama-50','Poupée My Life · écolière','My Life schoolgirl doll','poupees','My Life As','/products/poupees-mama/mama-50.webp'),
  ('mama-51','Miraculous · poupée renarde','Miraculous fox hero doll','poupees','Miraculous','/products/poupees-mama/mama-51.webp'),
  ('mama-52','Disney La Petite Sirène · poupée Ursula','Disney The Little Mermaid Ursula doll','disney','Disney Princess','/products/poupees-mama/mama-52.webp'),
  ('mama-53','Disney La Petite Sirène · ensemble de poupées','Disney The Little Mermaid doll set','disney','Disney Princess','/products/poupees-mama/mama-53.webp'),
  ('mama-54','Disney Encanto · poupée Isabela et accessoires','Disney Encanto Isabela doll and accessories','disney','Disney Encanto','/products/poupees-mama/mama-54.webp'),
  ('mama-55','Poupée rousse en tenue d''automne','Red-haired doll in autumn outfit','poupees','Poupée mode','/products/poupees-mama/mama-55.webp'),
  ('mama-56','Poupée Karma''s World','Karma''s World doll','poupees','Karma''s World','/products/poupees-mama/mama-56.webp'),
  ('mama-57','Ensemble coiffure pour poupée','Doll styling set','poupees','Poupée mode','/products/poupees-mama/mama-57.webp'),
  ('mama-58','Miraculous · poupée Bunnyx','Miraculous Bunnyx doll','poupees','Miraculous','/products/poupees-mama/mama-58.webp'),
  ('mama-59','My Life · chaussures roses','My Life pink shoes','poupees','My Life As','/products/poupees-mama/mama-59.webp'),
  ('mama-60','My Life · mini-figurines de héros','My Life hero mini figures','poupees','My Life As','/products/poupees-mama/mama-60.webp'),
  ('mama-61','My Life · ensemble de cuisine','My Life kitchen set','poupees','My Life As','/products/poupees-mama/mama-61.webp'),
  ('mama-62','Disney Princesses · tête à coiffer Raiponce','Disney Princess Rapunzel styling head','disney','Disney Princess','/products/poupees-mama/mama-62.webp'),
  ('mama-63','Ensemble épicerie pour poupée','Doll grocery set','poupees','Poupée mode','/products/poupees-mama/mama-63.webp')
)
INSERT OR IGNORE INTO products (id,name_fr,name_en,description_fr,description_en,category,price,stock,status,badge,ages,image_url,visible,price_qc,price_conakry,stock_qc,stock_conakry,visible_qc,visible_conakry,alert_threshold,featured,variants_json,images_json,brand,created_at,updated_at)
SELECT id,name_fr,name_en,
 CASE WHEN category='disney' THEN 'Poupée ou accessoire de princesse Disney.' ELSE 'Poupée ou accessoire pour enrichir les histoires et le jeu imaginatif.' END,
 CASE WHEN category='disney' THEN 'Disney princess doll or accessory.' ELSE 'Doll or accessory for imaginative storytelling and play.' END,
 category,0,1,'available','new','3+',image_url,1,0,0,1,1,1,1,2,0,'[]','[]',brand,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM arrivals;

WITH current_max(prefix,max_number) AS (
 SELECT 'DIS',COALESCE(MAX(CAST(SUBSTR(article_number,4) AS INTEGER)),0) FROM products WHERE article_number GLOB 'DIS[0-9]*' AND id NOT LIKE 'mama-%'
 UNION ALL
 SELECT 'POU',COALESCE(MAX(CAST(SUBSTR(article_number,4) AS INTEGER)),0) FROM products WHERE article_number GLOB 'POU[0-9]*' AND id NOT LIKE 'mama-%'
), ranked AS (
 SELECT id,CASE WHEN category='disney' THEN 'DIS' ELSE 'POU' END AS prefix,
 ROW_NUMBER() OVER (PARTITION BY CASE WHEN category='disney' THEN 'DIS' ELSE 'POU' END ORDER BY id) AS sequence
 FROM products WHERE id LIKE 'mama-%' AND (article_number IS NULL OR TRIM(article_number)='')
)
UPDATE products
SET article_number=(SELECT ranked.prefix || printf('%04d',current_max.max_number+ranked.sequence) FROM ranked JOIN current_max ON current_max.prefix=ranked.prefix WHERE ranked.id=products.id)
WHERE id IN (SELECT id FROM ranked);
