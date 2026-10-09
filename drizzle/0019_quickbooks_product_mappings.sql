-- QuickBooks inventory identity mapping only (no inventory write or invoice creation).
-- One CMS product has one separate QuickBooks Inventory item in each market.
-- Do NOT map a fictitious test QBO item to a real CMS product.
-- Inventory changes must be reconciled against the recorded order and sync ledger;
-- never blindly decrement a CMS stock when QBO invoice already reflects that sale.
CREATE TABLE IF NOT EXISTS quickbooks_product_mappings (
  product_id TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('qc', 'conakry')),
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  realm_id TEXT NOT NULL CHECK (length(TRIM(realm_id)) > 0),
  qbo_item_id TEXT NOT NULL CHECK (length(TRIM(qbo_item_id)) > 0),
  qbo_item_sku TEXT NOT NULL CHECK (length(TRIM(qbo_item_sku)) > 0),
  cms_article_number TEXT NOT NULL CHECK (length(TRIM(cms_article_number)) > 0),
  currency TEXT NOT NULL CHECK (
    (region = 'qc' AND currency = 'CAD') OR
    (region = 'conakry' AND currency = 'GNF')
  ),
  state TEXT NOT NULL DEFAULT 'pending_review' CHECK (
    state IN ('pending_review', 'verified', 'disabled', 'needs_reconciliation')
  ),
  last_cms_stock INTEGER,
  last_qbo_stock REAL,
  last_checked_at TEXT,
  last_synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (product_id, region, environment, realm_id),
  UNIQUE (environment, realm_id, qbo_item_id),
  UNIQUE (environment, realm_id, qbo_item_sku)
);
CREATE INDEX IF NOT EXISTS idx_quickbooks_product_mappings_status
  ON quickbooks_product_mappings (environment, realm_id, state, region);
