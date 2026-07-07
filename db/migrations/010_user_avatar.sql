ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_path TEXT,
  ADD COLUMN IF NOT EXISTS avatar_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN users.avatar_path IS 'Relative path under server/media, e.g. avatars/{userId}.webp';
COMMENT ON COLUMN users.avatar_mime_type IS 'image/webp or image/gif';