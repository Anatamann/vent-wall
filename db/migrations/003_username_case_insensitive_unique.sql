-- Prevent duplicate usernames that differ only by letter case (e.g. Demo vs demo)

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique ON users (LOWER(username));