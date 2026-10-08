-- Foundation only: records the one-to-one mapping between an existing storefront
-- order and its QuickBooks invoice. No existing order is modified and no invoice
-- is created by this migration. Deployment of later sync code requires a separate opt-in.
--
-- Deliberately no foreign key on orders: cancelled/deleted storefront orders
-- must not erase accounting identifiers, audit trails or idempotency locks.
CREATE TABLE IF NOT EXISTS quickbooks_order_sync (
  order_id TEXT PRIMARY KEY NOT NULL,
  source TEXT NOT NULL DEFAULT 'storefront' CHECK (source IN ('storefront', 'admin')),
  region TEXT NOT NULL CHECK (region IN ('qc', 'conakry')),
  currency TEXT NOT NULL CHECK (
    (region = 'qc' AND currency = 'CAD') OR
    (region = 'conakry' AND currency = 'GNF')
  ),
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  realm_id TEXT NOT NULL,
  doc_number TEXT NOT NULL,
  order_snapshot_json TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (
    state IN (
      'pending', 'processing', 'verified', 'error', 'unknown',
      'cancellation_pending', 'cancelled', 'manual_review'
    )
  ),
  qbo_customer_id TEXT,
  qbo_invoice_id TEXT,
  qbo_invoice_total REAL,
  qbo_invoice_balance REAL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_attempt_at TEXT,
  last_error_code TEXT,
  last_error_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (environment, realm_id, doc_number),
  UNIQUE (environment, realm_id, qbo_invoice_id)
);
CREATE INDEX IF NOT EXISTS idx_quickbooks_order_sync_state
  ON quickbooks_order_sync (environment, state, updated_at);
CREATE INDEX IF NOT EXISTS idx_quickbooks_order_sync_realm
  ON quickbooks_order_sync (environment, realm_id, created_at);
