ALTER TABLE orders ADD COLUMN customer_email TEXT;
ALTER TABLE orders ADD COLUMN delivery_address TEXT;
ALTER TABLE orders ADD COLUMN items_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE orders ADD COLUMN source TEXT NOT NULL DEFAULT 'cms';

CREATE TABLE customers (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT 'qc',
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE customer_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX customers_email_idx ON customers(email);
CREATE INDEX customer_sessions_customer_idx ON customer_sessions(customer_id, expires_at);
CREATE INDEX orders_customer_email_idx ON orders(customer_email, created_at);
