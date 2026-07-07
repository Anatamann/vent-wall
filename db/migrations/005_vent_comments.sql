-- Emoji-only comments on vents; available only while the vent is on the Wall

CREATE TABLE IF NOT EXISTS vent_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vent_id UUID NOT NULL REFERENCES vents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vent_comments_vent_id_created
  ON vent_comments (vent_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_vent_comments_user_vent
  ON vent_comments (user_id, vent_id);