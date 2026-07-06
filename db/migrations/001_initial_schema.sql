-- Vent Wall initial schema (local PostgreSQL)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_post_date DATE,
  post_count_today INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT users_username_format CHECK (username ~ '^[a-zA-Z0-9_-]{3,30}$')
);

CREATE TABLE mood_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

CREATE TABLE vent_tags (
  vent_id UUID NOT NULL REFERENCES vents(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES mood_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (vent_id, tag_id)
);

CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vent_id UUID NOT NULL REFERENCES vents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vent_id, user_id, emoji)
);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vent_id UUID NOT NULL REFERENCES vents(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vents_created_at ON vents (created_at DESC);
CREATE INDEX idx_vents_expires_at ON vents (expires_at);
CREATE INDEX idx_vents_user_id ON vents (user_id);
CREATE INDEX idx_reactions_vent_id ON reactions (vent_id);
CREATE INDEX idx_reactions_user_id ON reactions (user_id);
CREATE INDEX idx_vent_tags_tag_id ON vent_tags (tag_id);
CREATE INDEX idx_vent_tags_vent_id ON vent_tags (vent_id);
CREATE INDEX idx_reports_status ON reports (status);