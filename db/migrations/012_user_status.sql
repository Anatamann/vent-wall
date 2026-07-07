ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status TEXT;

COMMENT ON COLUMN users.status IS 'Optional profile status, max 30 chars, letters/numbers/spaces only';