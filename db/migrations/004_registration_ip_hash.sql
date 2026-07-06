-- Track hashed client IPs at signup to limit multi-account spam without storing raw IPs

ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_ip_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_users_registration_ip_hash
  ON users (registration_ip_hash);

CREATE INDEX IF NOT EXISTS idx_users_registration_ip_hash_created
  ON users (registration_ip_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS blocked_ip_hashes (
  ip_hash TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_blocked_ip_hashes_expires
  ON blocked_ip_hashes (expires_at);

CREATE TABLE IF NOT EXISTS registration_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  succeeded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registration_attempts_ip_hash_created
  ON registration_attempts (ip_hash, created_at DESC);