ALTER TABLE products ADD COLUMN price_qc INTEGER;
ALTER TABLE products ADD COLUMN price_conakry INTEGER;
ALTER TABLE products ADD COLUMN stock_qc INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN stock_conakry INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN visible_qc INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN visible_conakry INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN alert_threshold INTEGER NOT NULL DEFAULT 2;
ALTER TABLE products ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN promo_price_qc INTEGER;
ALTER TABLE products ADD COLUMN promo_price_conakry INTEGER;
ALTER TABLE products ADD COLUMN variants_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE products ADD COLUMN images_json TEXT NOT NULL DEFAULT '[]';
UPDATE products SET price_conakry = price, stock_conakry = stock, visible_conakry = visible;

ALTER TABLE orders ADD COLUMN region TEXT NOT NULL DEFAULT 'conakry';
ALTER TABLE orders ADD COLUMN currency TEXT NOT NULL DEFAULT 'GNF';
ALTER TABLE orders ADD COLUMN delivery_zone TEXT;

ALTER TABLE promotions ADD COLUMN region TEXT NOT NULL DEFAULT 'both';
ALTER TABLE promotions ADD COLUMN promo_code TEXT;
ALTER TABLE promotions ADD COLUMN discount_type TEXT NOT NULL DEFAULT 'percent';
ALTER TABLE promotions ADD COLUMN discount_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE promotions ADD COLUMN minimum_purchase INTEGER NOT NULL DEFAULT 0;
ALTER TABLE promotions ADD COLUMN usage_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE promotions ADD COLUMN usage_limit INTEGER;

ALTER TABLE subscribers ADD COLUMN region TEXT NOT NULL DEFAULT 'conakry';

CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  admin_id TEXT REFERENCES admins(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE site_versions (
  id TEXT PRIMARY KEY NOT NULL,
  region TEXT NOT NULL,
  settings_json TEXT NOT NULL,
  admin_id TEXT REFERENCES admins(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX stock_movements_region_idx ON stock_movements(region, created_at);
CREATE INDEX orders_region_idx ON orders(region, created_at);
CREATE INDEX subscribers_region_idx ON subscribers(region);
CREATE INDEX site_versions_region_idx ON site_versions(region, created_at);
