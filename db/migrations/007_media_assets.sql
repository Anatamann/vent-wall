-- Media assets for GIF/sticker comments (Klipy + future local catalog)

CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('gif', 'sticker', 'local_gif')),
  source TEXT NOT NULL CHECK (source IN ('local', 'klipy')),
  external_id TEXT,
  preview_url TEXT,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/gif',
  width INTEGER,
  height INTEGER,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS media_assets_klipy_external_unique
  ON media_assets (source, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS media_assets_expires_at
  ON media_assets (expires_at);

ALTER TABLE vent_comments
  ADD COLUMN IF NOT EXISTS comment_type TEXT NOT NULL DEFAULT 'emoji'
    CHECK (comment_type IN ('emoji', 'gif')),
  ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL;

ALTER TABLE vent_comments DROP CONSTRAINT IF EXISTS vent_comments_content_check;

ALTER TABLE vent_comments ALTER COLUMN emoji DROP NOT NULL;

ALTER TABLE vent_comments ADD CONSTRAINT vent_comments_content_check CHECK (
  (comment_type = 'emoji' AND emoji IS NOT NULL AND asset_id IS NULL)
  OR (comment_type = 'gif' AND asset_id IS NOT NULL AND emoji IS NULL)
);