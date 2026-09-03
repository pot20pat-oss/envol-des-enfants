-- Ajout des 17 articles de l'archive mama(3).rar.
WITH arrivals(id,name_fr,name_en,description_fr,description_en,brand,image_url,ages) AS (
 VALUES
  ('mama3-01','Gilet de sauvetage enfant · orange et noir','Kids life jacket · orange and black','Gilet de flottaison pour les activités aquatiques des enfants.','Kids flotation vest for water activities.','','/products/mama3/mama3-01.jpg','3+'),
  ('mama3-02','Accessoire de baignade enfant · rose','Kids swim accessory · pink','Accessoire coloré pour les jeux d’eau et la baignade.','Colourful accessory for swimming and water play.','','/products/mama3/mama3-02.jpg','3+'),
  ('mama3-03','Glissade aquatique Slip ’N Slide','Slip ’N Slide water slide','Glissade aquatique extérieure pour jouer dans l’eau.','Outdoor water slide for summer play.','Slip ’N Slide','/products/mama3/mama3-03.jpg','3+'),
  ('mama3-04','Banzai Jr · jeu d’eau Kick ’N Splash','Banzai Jr · Kick ’N Splash water game','Jeu d’eau extérieur pour enfants.','Outdoor water play game for kids.','Banzai Jr','/products/mama3/mama3-04.jpg','3+'),
  ('mama3-05','Intex · centre de jeux aquatiques','Intex · inflatable water play centre','Centre de jeux gonflable avec activités aquatiques.','Inflatable play centre with water activities.','Intex','/products/mama3/mama3-05.jpg','3+'),
  ('mama3-06','Masque de plongée enfant','Kids diving mask','Masque pour découvrir les jeux sous l’eau.','Mask for underwater play and discovery.','','/products/mama3/mama3-06.jpg','3+'),
  ('mama3-07','Arroseur personnage · jeu d’eau','Character sprinkler · water toy','Arroseur ludique pour les jeux d’eau extérieurs.','Fun sprinkler for outdoor water play.','','/products/mama3/mama3-07.jpg','3+'),
  ('mama3-08','Gilet de flottaison enfant · motifs orange','Kids flotation vest · orange print','Gilet de flottaison coloré pour enfant.','Colourful kids flotation vest.','','/products/mama3/mama3-08.jpg','3+'),
  ('mama3-09','Piscine gonflable · ensemble de jeux','Inflatable pool · play set','Ensemble gonflable pour les jeux d’eau en famille.','Inflatable set for family water play.','','/products/mama3/mama3-09.jpg','3+'),
  ('mama3-10','H2OGO! · triple glissade aquatique','H2OGO! · triple water slide','Triple piste de glissade pour les jeux d’eau extérieurs.','Triple-lane slide for outdoor water play.','H2OGO!','/products/mama3/mama3-10.jpg','3+'),
  ('mama3-11','Slip ’N Slide · glissade aquatique','Slip ’N Slide · water slide','Glissade aquatique extérieure pour enfants.','Outdoor water slide for kids.','Slip ’N Slide','/products/mama3/mama3-11.jpg','3+'),
  ('mama3-12','Paw Patrol · jouet sauteur','Paw Patrol · hopper toy','Jouet sauteur pour bouger et jouer à l’extérieur.','Hopper toy for active outdoor play.','Paw Patrol','/products/mama3/mama3-12.jpg','3+'),
  ('mama3-13','Sac transparent enfant · motif dessin animé','Kids transparent tote · cartoon print','Petit sac transparent pratique pour la piscine et les sorties.','Small transparent tote for pool days and outings.','','/products/mama3/mama3-13.jpg','3+'),
  ('mama3-14','Arroseur poisson · jeu d’eau','Fish sprinkler · water toy','Arroseur amusant en forme de poisson pour l’extérieur.','Fun fish-shaped sprinkler for outdoor play.','','/products/mama3/mama3-14.jpg','3+'),
  ('mama3-15','Centre de jeux aquatiques gonflable','Inflatable water play centre','Centre gonflable conçu pour les jeux d’eau des enfants.','Inflatable centre designed for kids water play.','','/products/mama3/mama3-15.jpg','3+'),
  ('mama3-16','Jeu d’eau extérieur · coffret','Outdoor water play set','Coffret de jeu pour profiter des activités d’eau à l’extérieur.','Play set for outdoor water activities.','','/products/mama3/mama3-16.jpg','3+'),
  ('mama3-17','Seau de plage vert','Green beach bucket','Seau en plastique pour les jeux de plage, de sable et d’eau.','Plastic bucket for beach, sand and water play.','','/products/mama3/mama3-17.jpg','2+')
)
INSERT OR IGNORE INTO products (id,name_fr,name_en,description_fr,description_en,category,price,stock,status,badge,ages,image_url,visible,price_qc,price_conakry,stock_qc,stock_conakry,visible_qc,visible_conakry,alert_threshold,featured,variants_json,images_json,brand,created_at,updated_at)
SELECT id,name_fr,name_en,description_fr,description_en,'piscine',0,1,'available','new',ages,image_url,1,0,0,1,1,1,1,2,0,'[]','[]',brand,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM arrivals;

WITH current_max(max_number) AS (
 SELECT COALESCE(MAX(CAST(SUBSTR(article_number,4) AS INTEGER)),0)
 FROM products
 WHERE article_number GLOB 'PIS[0-9]*' AND id NOT LIKE 'mama3-%'
), ranked AS (
 SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
 FROM products
 WHERE id LIKE 'mama3-%'
)
UPDATE products
SET article_number = 'PIS' || printf('%04d',
  (SELECT max_number FROM current_max) +
  (SELECT rn FROM ranked WHERE ranked.id = products.id)
)
WHERE id LIKE 'mama3-%';
