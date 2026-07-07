-- Human-friendly public post identifiers for URLs (e.g. /post/k7mqx2np)

ALTER TABLE vents ADD COLUMN IF NOT EXISTS slug TEXT;

ALTER TABLE vents DROP CONSTRAINT IF EXISTS vents_slug_format;

ALTER TABLE vents ADD CONSTRAINT vents_slug_format
  CHECK (slug IS NULL OR slug ~ '^[a-hjkmnp-z2-9]{8}$');

CREATE UNIQUE INDEX IF NOT EXISTS vents_slug_unique ON vents (slug);