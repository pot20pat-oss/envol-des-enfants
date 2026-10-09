-- Product returns: quarantine and manual inspection before resale.
-- This migration only creates records for a future controlled workflow.
-- It DOES NOT modify any order, product stock, QBO invoice or refund.
CREATE TABLE IF NOT EXISTS order_returns (
  id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  request_key TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('qc','conakry')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  -- Nothing becomes resale stock from the arrival of a returned parcel.
  inspection_state TEXT NOT NULL DEFAULT 'awaiting_inspection'
    CHECK (inspection_state IN (
      'awaiting_inspection','quarantined','approved_for_resale',
      'not_resellable'
    )),
  -- 1 only after a human actually verifies each condition.
  unused_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (unused_confirmed IN (0,1)),
  undamaged_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (undamaged_confirmed IN (0,1)),
  packaging_intact_confirmed INTEGER NOT NULL DEFAULT 0
    CHECK (packaging_intact_confirmed IN (0,1)),
  inspected_by TEXT,
  inspected_at TEXT,
  inspection_notes TEXT,
  -- Approval and stock posting are separate operations.
  stock_posted INTEGER NOT NULL DEFAULT 0 CHECK (stock_posted IN (0,1)),
  stock_posted_at TEXT,
  refund_state TEXT NOT NULL DEFAULT 'not_processed'
    CHECK (refund_state IN ('not_processed','pending_review','processed','rejected')),
  qbo_credit_memo_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (order_id,product_id,request_key),
  CHECK (
    inspection_state <> 'approved_for_resale' OR
    (unused_confirmed=1 AND undamaged_confirmed=1 AND packaging_intact_confirmed=1
     AND inspected_by IS NOT NULL AND inspected_at IS NOT NULL)
  ),
  CHECK (stock_posted=0 OR inspection_state='approved_for_resale')
);
CREATE INDEX IF NOT EXISTS idx_order_returns_order
  ON order_returns (order_id,created_at);
CREATE INDEX IF NOT EXISTS idx_order_returns_inspection
  ON order_returns (region,inspection_state,stock_posted,created_at);
CREATE INDEX IF NOT EXISTS idx_order_returns_product
  ON order_returns (product_id,region,inspection_state);
