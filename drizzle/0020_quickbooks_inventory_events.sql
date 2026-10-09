-- Bidirectional inventory change ledger. Infrastructure only.
-- This migration does not touch existing products, orders, QuickBooks data,
-- or trigger automatic inventory adjustments.
-- Each event keeps its original origin and idempotency key, to distinguish
-- a legitimate restock from a sale already deducted in both systems.
CREATE TABLE IF NOT EXISTS quickbooks_inventory_events (
  id TEXT PRIMARY KEY NOT NULL,
  product_id TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('qc','conakry')),
  environment TEXT NOT NULL CHECK (environment IN ('sandbox','production')),
  realm_id TEXT NOT NULL CHECK (length(TRIM(realm_id)) > 0),
  origin TEXT NOT NULL CHECK (origin IN ('cms','quickbooks')),
  -- An event_key must be stable across retries, e.g. stock_movement ID,
  -- order ID plus line item, or QBO transaction ID and revision.
  event_key TEXT NOT NULL CHECK (length(TRIM(event_key)) > 0),
  kind TEXT NOT NULL CHECK (
    kind IN ('sale','cancellation','return','restock','manual_adjustment',
             'inventory_adjustment','purchase','other')
  ),
  stock_before REAL,
  stock_after REAL,
  quantity_change REAL,
  source_revision TEXT,
  qbo_item_id TEXT,
  -- Deliberately review-only by default. No worker consumes this yet.
  state TEXT NOT NULL DEFAULT 'manual_review' CHECK (
    state IN ('manual_review','pending','processing','applied','skipped',
              'conflict','error')
  ),
  destination_event_id TEXT,
  error_code TEXT,
  observed_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (environment,realm_id,region,origin,event_key)
);
CREATE INDEX IF NOT EXISTS idx_quickbooks_inventory_events_reconcile
  ON quickbooks_inventory_events (environment,realm_id,region,product_id,observed_at);
CREATE INDEX IF NOT EXISTS idx_quickbooks_inventory_events_state
  ON quickbooks_inventory_events (environment,realm_id,state,updated_at);
