-- Optional Klipy GIF attachment on vents (text, GIF, or both)

ALTER TABLE vents
  ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL;

ALTER TABLE vents DROP CONSTRAINT IF EXISTS vents_content_check;

ALTER TABLE vents ALTER COLUMN content DROP NOT NULL;
ALTER TABLE vents ALTER COLUMN content SET DEFAULT '';

ALTER TABLE vents ADD CONSTRAINT vents_content_length_check CHECK (
  char_length(content) <= 500
);

ALTER TABLE vents ADD CONSTRAINT vents_content_required_check CHECK (
  char_length(trim(content)) >= 1 OR asset_id IS NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vents_asset_id ON vents (asset_id)
  WHERE asset_id IS NOT NULL;