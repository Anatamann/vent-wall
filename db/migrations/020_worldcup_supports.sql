-- World Cup Finals 2026 — Support Wall + Support Globe
-- Short public ids (prefix s / k) match the rest of Vent Wall; no UUID URLs.

CREATE TABLE IF NOT EXISTS worldcup_teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  color TEXT NOT NULL
);

INSERT INTO worldcup_teams (id, name, emoji, color) VALUES
  ('spain', 'Spain', '🇪🇸', '#C60B1E'),
  ('argentina', 'Argentina', '🇦🇷', '#74ACDF')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS worldcup_supports (
  id VARCHAR(12) PRIMARY KEY,
  ballot_id TEXT UNIQUE,
  user_id VARCHAR(12) REFERENCES users(id) ON DELETE SET NULL,
  team_id TEXT NOT NULL REFERENCES worldcup_teams(id),
  content TEXT CHECK (content IS NULL OR char_length(content) <= 500),
  asset_id VARCHAR(12) REFERENCES media_assets(id) ON DELETE SET NULL,
  is_wall_post BOOLEAN NOT NULL DEFAULT false,
  contribute_to_globe BOOLEAN NOT NULL DEFAULT true,
  location_country_code TEXT,
  location_country TEXT,
  location_state TEXT,
  location_city TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  wall_published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wc_supports_team_wall
  ON worldcup_supports (team_id, wall_published_at DESC)
  WHERE is_wall_post = true;

CREATE INDEX IF NOT EXISTS idx_wc_supports_wall_created
  ON worldcup_supports (created_at DESC)
  WHERE is_wall_post = true;

CREATE INDEX IF NOT EXISTS idx_wc_supports_globe
  ON worldcup_supports (created_at DESC)
  WHERE contribute_to_globe = true
    AND location_lat IS NOT NULL
    AND location_lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wc_supports_ip_hash_created
  ON worldcup_supports (ip_hash, created_at DESC)
  WHERE ip_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wc_supports_user
  ON worldcup_supports (user_id)
  WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS worldcup_support_comments (
  id VARCHAR(12) PRIMARY KEY,
  support_id VARCHAR(12) NOT NULL REFERENCES worldcup_supports(id) ON DELETE CASCADE,
  user_id VARCHAR(12) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_type TEXT NOT NULL CHECK (comment_type IN ('emoji', 'gif')),
  emoji TEXT CHECK (emoji IS NULL OR char_length(emoji) BETWEEN 1 AND 32),
  asset_id VARCHAR(12) REFERENCES media_assets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (emoji IS NOT NULL OR asset_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_wc_comments_support_created
  ON worldcup_support_comments (support_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_wc_comments_support_user
  ON worldcup_support_comments (support_id, user_id);

COMMENT ON TABLE worldcup_supports IS
  'Anonymous ballot vote (+ optional wall post). team_id immutable after insert.';
COMMENT ON COLUMN worldcup_supports.ballot_id IS
  'Cookie ballot identity; unique one-vote lock.';
COMMENT ON COLUMN worldcup_supports.ip_hash IS
  'HMAC of client IP for rate limits; never raw IP.';
