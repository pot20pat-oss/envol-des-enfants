-- Unique one-time invoice creation test, restricted by application code to the Canadian QBO Sandbox.
-- An attempted API operation stays recorded even if its remote outcome is uncertain;
-- never auto-retry a potentially successful financial write.
CREATE TABLE IF NOT EXISTS quickbooks_sandbox_test_runs (
  test_key TEXT PRIMARY KEY NOT NULL,
  realm_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('attempting','succeeded','rejected','unknown')),
  invoice_id TEXT,
  invoice_number TEXT,
  total_amount REAL,
  open_balance REAL,
  error_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
