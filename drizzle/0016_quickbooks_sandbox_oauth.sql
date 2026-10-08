-- OAuth QuickBooks Online, environnement sandbox uniquement.
-- Jetons AES-GCM chiffres cote Worker; jamais dans les parametres publics du CMS.
CREATE TABLE IF NOT EXISTS quickbooks_oauth_states (
  state_hash TEXT PRIMARY KEY NOT NULL,
  admin_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS quickbooks_oauth_states_expiry_idx ON quickbooks_oauth_states(expires_at);
CREATE TABLE IF NOT EXISTS quickbooks_connections (
  environment TEXT PRIMARY KEY NOT NULL CHECK(environment = 'sandbox'),
  realm_id TEXT NOT NULL,
  encrypted_tokens TEXT NOT NULL,
  connected_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
