-- Décisions manuelles de doublons : une ligne par paire canonique, sans modifier les produits.
CREATE TABLE IF NOT EXISTS cms_duplicate_verdicts (
  pair_key TEXT PRIMARY KEY NOT NULL,
  product_a TEXT NOT NULL,
  product_b TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('confirmed','rejected','variant')),
  decided_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (product_a < product_b)
);
CREATE INDEX IF NOT EXISTS cms_duplicate_verdicts_product_a ON cms_duplicate_verdicts(product_a);
CREATE INDEX IF NOT EXISTS cms_duplicate_verdicts_product_b ON cms_duplicate_verdicts(product_b);
CREATE TABLE IF NOT EXISTS cms_duplicate_verdict_events (
  id TEXT PRIMARY KEY NOT NULL,
  pair_key TEXT NOT NULL,
  product_a TEXT NOT NULL,
  product_b TEXT NOT NULL,
  previous_verdict TEXT,
  next_verdict TEXT,
  decided_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS cms_duplicate_verdict_events_pair ON cms_duplicate_verdict_events(pair_key,created_at);
