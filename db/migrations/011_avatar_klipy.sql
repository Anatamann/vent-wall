ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_klipy_id TEXT;

COMMENT ON COLUMN users.avatar_klipy_id IS 'Klipy external GIF id used for the cached avatar file';