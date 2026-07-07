-- Login throttling and report deduplication

CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  username_normalized TEXT NOT NULL,
  succeeded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_attempts_ip_hash_created_idx
  ON login_attempts (ip_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS login_attempts_username_created_idx
  ON login_attempts (username_normalized, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS reports_vent_reporter_unique
  ON reports (vent_id, reporter_id);