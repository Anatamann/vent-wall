-- Replace UUID primary/foreign keys with compact public ids (e.g. u01, t16, v03).

CREATE OR REPLACE FUNCTION public_id_from_uuid(entity_prefix TEXT, raw_id UUID)
RETURNS VARCHAR(12) AS $$
DECLARE
  id_text TEXT := raw_id::text;
  tail TEXT;
BEGIN
  CASE entity_prefix
    WHEN 'u' THEN
      IF id_text ~ '^11111111-1111-1111-1111-11111111110[1-9]$' THEN
        RETURN 'u0' || right(id_text, 1);
      END IF;
      RETURN 'u' || substr(md5(id_text), 1, 7);
    WHEN 't' THEN
      IF id_text ~ '^22222222-2222-2222-2222-2222222222' THEN
        tail := right(split_part(id_text, '-', 5), 2);
        RETURN 't' || lpad(tail, 2, '0');
      END IF;
      RETURN 't' || substr(md5(id_text), 1, 7);
    WHEN 'v' THEN
      IF id_text ~ '^33333333-3333-3333-3333-3333333333' THEN
        tail := right(split_part(id_text, '-', 5), 2);
        RETURN 'v' || lpad(tail, 2, '0');
      END IF;
      RETURN 'v' || substr(md5(id_text), 1, 7);
    WHEN 'c' THEN
      IF id_text ~ '^44444444-4444-4444-4444-4444444444' THEN
        tail := right(split_part(id_text, '-', 5), 2);
        RETURN 'c' || lpad(tail, 2, '0');
      END IF;
      RETURN 'c' || substr(md5(id_text), 1, 7);
    WHEN 'm' THEN
      RETURN 'm' || substr(md5(id_text), 1, 7);
    WHEN 'r' THEN
      RETURN 'r' || substr(md5(id_text), 1, 7);
    WHEN 'f' THEN
      RETURN 'f' || substr(md5(id_text), 1, 7);
    WHEN 'a' THEN
      RETURN 'a' || substr(md5(id_text), 1, 7);
    WHEN 'l' THEN
      RETURN 'l' || substr(md5(id_text), 1, 7);
    WHEN 'g' THEN
      RETURN 'g' || substr(md5(id_text), 1, 7);
    ELSE
      RAISE EXCEPTION 'Unknown public id prefix: %', entity_prefix;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'f' AND connamespace = 'public'::regnamespace
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

CREATE TEMP TABLE _id_map (
  entity TEXT NOT NULL,
  old_id TEXT NOT NULL,
  new_id VARCHAR(12) NOT NULL,
  PRIMARY KEY (entity, old_id)
);

INSERT INTO _id_map (entity, old_id, new_id)
SELECT 'user', id::text, public_id_from_uuid('u', id) FROM users;

INSERT INTO _id_map (entity, old_id, new_id)
SELECT 'tag', id::text, public_id_from_uuid('t', id) FROM mood_tags;

INSERT INTO _id_map (entity, old_id, new_id)
SELECT 'media', id::text, public_id_from_uuid('m', id) FROM media_assets;

INSERT INTO _id_map (entity, old_id, new_id)
SELECT 'vent', id::text, public_id_from_uuid('v', id) FROM vents;

INSERT INTO _id_map (entity, old_id, new_id)
SELECT 'comment', id::text, public_id_from_uuid('c', id) FROM vent_comments;

INSERT INTO _id_map (entity, old_id, new_id)
SELECT 'reaction', id::text, public_id_from_uuid('r', id) FROM reactions;

INSERT INTO _id_map (entity, old_id, new_id)
SELECT 'feedback', id::text, public_id_from_uuid('f', id) FROM user_feedback;

INSERT INTO _id_map (entity, old_id, new_id)
SELECT 'audit', id::text, public_id_from_uuid('a', id) FROM admin_audit_log;

INSERT INTO _id_map (entity, old_id, new_id)
SELECT 'login', id::text, public_id_from_uuid('l', id) FROM login_attempts;

INSERT INTO _id_map (entity, old_id, new_id)
SELECT 'registration', id::text, public_id_from_uuid('g', id) FROM registration_attempts;

-- users
ALTER TABLE users ADD COLUMN id_new VARCHAR(12);
UPDATE users u
SET id_new = m.new_id
FROM _id_map m
WHERE m.entity = 'user' AND m.old_id = u.id::text;
ALTER TABLE users DROP CONSTRAINT users_pkey;
ALTER TABLE users DROP COLUMN id;
ALTER TABLE users RENAME COLUMN id_new TO id;
ALTER TABLE users ADD PRIMARY KEY (id);

-- mood_tags
ALTER TABLE mood_tags ADD COLUMN id_new VARCHAR(12);
UPDATE mood_tags t
SET id_new = m.new_id
FROM _id_map m
WHERE m.entity = 'tag' AND m.old_id = t.id::text;
ALTER TABLE mood_tags DROP CONSTRAINT mood_tags_pkey;
ALTER TABLE mood_tags DROP COLUMN id;
ALTER TABLE mood_tags RENAME COLUMN id_new TO id;
ALTER TABLE mood_tags ADD PRIMARY KEY (id);

-- media_assets
ALTER TABLE media_assets ADD COLUMN id_new VARCHAR(12);
UPDATE media_assets a
SET id_new = m.new_id
FROM _id_map m
WHERE m.entity = 'media' AND m.old_id = a.id::text;
ALTER TABLE media_assets DROP CONSTRAINT media_assets_pkey;
ALTER TABLE media_assets DROP COLUMN id;
ALTER TABLE media_assets RENAME COLUMN id_new TO id;
ALTER TABLE media_assets ADD PRIMARY KEY (id);

-- vents
ALTER TABLE vents ADD COLUMN id_new VARCHAR(12);
UPDATE vents v
SET id_new = m.new_id
FROM _id_map m
WHERE m.entity = 'vent' AND m.old_id = v.id::text;
ALTER TABLE vents DROP CONSTRAINT vents_pkey;
ALTER TABLE vents DROP COLUMN id;
ALTER TABLE vents RENAME COLUMN id_new TO id;
ALTER TABLE vents ADD PRIMARY KEY (id);

ALTER TABLE vents ADD COLUMN user_id_new VARCHAR(12);
UPDATE vents v
SET user_id_new = m.new_id
FROM _id_map m
WHERE m.entity = 'user' AND m.old_id = v.user_id::text;
ALTER TABLE vents DROP COLUMN user_id;
ALTER TABLE vents RENAME COLUMN user_id_new TO user_id;
ALTER TABLE vents ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE vents ADD COLUMN asset_id_new VARCHAR(12);
UPDATE vents v
SET asset_id_new = m.new_id
FROM _id_map m
WHERE m.entity = 'media' AND m.old_id = v.asset_id::text
  AND v.asset_id IS NOT NULL;
ALTER TABLE vents DROP COLUMN asset_id;
ALTER TABLE vents RENAME COLUMN asset_id_new TO asset_id;

-- vent_tags
ALTER TABLE vent_tags DROP CONSTRAINT vent_tags_pkey;
ALTER TABLE vent_tags ADD COLUMN vent_id_new VARCHAR(12);
UPDATE vent_tags vt
SET vent_id_new = m.new_id
FROM _id_map m
WHERE m.entity = 'vent' AND m.old_id = vt.vent_id::text;
ALTER TABLE vent_tags DROP COLUMN vent_id;
ALTER TABLE vent_tags RENAME COLUMN vent_id_new TO vent_id;
ALTER TABLE vent_tags ALTER COLUMN vent_id SET NOT NULL;

ALTER TABLE vent_tags ADD COLUMN tag_id_new VARCHAR(12);
UPDATE vent_tags vt
SET tag_id_new = m.new_id
FROM _id_map m
WHERE m.entity = 'tag' AND m.old_id = vt.tag_id::text;
ALTER TABLE vent_tags DROP COLUMN tag_id;
ALTER TABLE vent_tags RENAME COLUMN tag_id_new TO tag_id;
ALTER TABLE vent_tags ALTER COLUMN tag_id SET NOT NULL;
ALTER TABLE vent_tags ADD PRIMARY KEY (vent_id, tag_id);

-- reactions
ALTER TABLE reactions ADD COLUMN id_new VARCHAR(12);
UPDATE reactions r
SET id_new = m.new_id
FROM _id_map m
WHERE m.entity = 'reaction' AND m.old_id = r.id::text;
ALTER TABLE reactions DROP CONSTRAINT reactions_pkey;
ALTER TABLE reactions DROP COLUMN id;
ALTER TABLE reactions RENAME COLUMN id_new TO id;
ALTER TABLE reactions ADD PRIMARY KEY (id);

ALTER TABLE reactions ADD COLUMN vent_id_new VARCHAR(12);
UPDATE reactions r
SET vent_id_new = m.new_id
FROM _id_map m
WHERE m.entity = 'vent' AND m.old_id = r.vent_id::text;
ALTER TABLE reactions DROP COLUMN vent_id;
ALTER TABLE reactions RENAME COLUMN vent_id_new TO vent_id;
ALTER TABLE reactions ALTER COLUMN vent_id SET NOT NULL;

ALTER TABLE reactions ADD COLUMN user_id_new VARCHAR(12);
UPDATE reactions r
SET user_id_new = m.new_id
FROM _id_map m
WHERE m.entity = 'user' AND m.old_id = r.user_id::text;
ALTER TABLE reactions DROP COLUMN user_id;
ALTER TABLE reactions RENAME COLUMN user_id_new TO user_id;
ALTER TABLE reactions ALTER COLUMN user_id SET NOT NULL;

-- vent_comments
ALTER TABLE vent_comments ADD COLUMN id_new VARCHAR(12);
UPDATE vent_comments c
SET id_new = m.new_id
FROM _id_map m
WHERE m.entity = 'comment' AND m.old_id = c.id::text;
ALTER TABLE vent_comments DROP CONSTRAINT vent_comments_pkey;
ALTER TABLE vent_comments DROP COLUMN id;
ALTER TABLE vent_comments RENAME COLUMN id_new TO id;
ALTER TABLE vent_comments ADD PRIMARY KEY (id);

ALTER TABLE vent_comments ADD COLUMN vent_id_new VARCHAR(12);
UPDATE vent_comments c
SET vent_id_new = m.new_id
FROM _id_map m
WHERE m.entity = 'vent' AND m.old_id = c.vent_id::text;
ALTER TABLE vent_comments DROP COLUMN vent_id;
ALTER TABLE vent_comments RENAME COLUMN vent_id_new TO vent_id;
ALTER TABLE vent_comments ALTER COLUMN vent_id SET NOT NULL;

ALTER TABLE vent_comments ADD COLUMN user_id_new VARCHAR(12);
UPDATE vent_comments c
SET user_id_new = m.new_id
FROM _id_map m
WHERE m.entity = 'user' AND m.old_id = c.user_id::text;
ALTER TABLE vent_comments DROP COLUMN user_id;
ALTER TABLE vent_comments RENAME COLUMN user_id_new TO user_id;
ALTER TABLE vent_comments ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE vent_comments ADD COLUMN asset_id_new VARCHAR(12);
UPDATE vent_comments c
SET asset_id_new = m.new_id
FROM _id_map m
WHERE m.entity = 'media' AND m.old_id = c.asset_id::text
  AND c.asset_id IS NOT NULL;
ALTER TABLE vent_comments DROP COLUMN asset_id;
ALTER TABLE vent_comments RENAME COLUMN asset_id_new TO asset_id;

-- user_feedback
ALTER TABLE user_feedback ADD COLUMN id_new VARCHAR(12);
UPDATE user_feedback f
SET id_new = m.new_id
FROM _id_map m
WHERE m.entity = 'feedback' AND m.old_id = f.id::text;
ALTER TABLE user_feedback DROP CONSTRAINT user_feedback_pkey;
ALTER TABLE user_feedback DROP COLUMN id;
ALTER TABLE user_feedback RENAME COLUMN id_new TO id;
ALTER TABLE user_feedback ADD PRIMARY KEY (id);

ALTER TABLE user_feedback ADD COLUMN user_id_new VARCHAR(12);
UPDATE user_feedback f
SET user_id_new = m.new_id
FROM _id_map m
WHERE m.entity = 'user' AND m.old_id = f.user_id::text;
ALTER TABLE user_feedback DROP COLUMN user_id;
ALTER TABLE user_feedback RENAME COLUMN user_id_new TO user_id;
ALTER TABLE user_feedback ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE user_feedback ADD COLUMN reviewed_by_new VARCHAR(12);
UPDATE user_feedback f
SET reviewed_by_new = m.new_id
FROM _id_map m
WHERE m.entity = 'user' AND m.old_id = f.reviewed_by::text
  AND f.reviewed_by IS NOT NULL;
ALTER TABLE user_feedback DROP COLUMN reviewed_by;
ALTER TABLE user_feedback RENAME COLUMN reviewed_by_new TO reviewed_by;

-- admin_audit_log
ALTER TABLE admin_audit_log ADD COLUMN id_new VARCHAR(12);
UPDATE admin_audit_log a
SET id_new = m.new_id
FROM _id_map m
WHERE m.entity = 'audit' AND m.old_id = a.id::text;
ALTER TABLE admin_audit_log DROP CONSTRAINT admin_audit_log_pkey;
ALTER TABLE admin_audit_log DROP COLUMN id;
ALTER TABLE admin_audit_log RENAME COLUMN id_new TO id;
ALTER TABLE admin_audit_log ADD PRIMARY KEY (id);

ALTER TABLE admin_audit_log ADD COLUMN admin_user_id_new VARCHAR(12);
UPDATE admin_audit_log a
SET admin_user_id_new = m.new_id
FROM _id_map m
WHERE m.entity = 'user' AND m.old_id = a.admin_user_id::text;
ALTER TABLE admin_audit_log DROP COLUMN admin_user_id;
ALTER TABLE admin_audit_log RENAME COLUMN admin_user_id_new TO admin_user_id;
ALTER TABLE admin_audit_log ALTER COLUMN admin_user_id SET NOT NULL;

-- login_attempts
ALTER TABLE login_attempts ADD COLUMN id_new VARCHAR(12);
UPDATE login_attempts l
SET id_new = m.new_id
FROM _id_map m
WHERE m.entity = 'login' AND m.old_id = l.id::text;
ALTER TABLE login_attempts DROP CONSTRAINT login_attempts_pkey;
ALTER TABLE login_attempts DROP COLUMN id;
ALTER TABLE login_attempts RENAME COLUMN id_new TO id;
ALTER TABLE login_attempts ADD PRIMARY KEY (id);

-- registration_attempts
ALTER TABLE registration_attempts ADD COLUMN id_new VARCHAR(12);
UPDATE registration_attempts g
SET id_new = m.new_id
FROM _id_map m
WHERE m.entity = 'registration' AND m.old_id = g.id::text;
ALTER TABLE registration_attempts DROP CONSTRAINT registration_attempts_pkey;
ALTER TABLE registration_attempts DROP COLUMN id;
ALTER TABLE registration_attempts RENAME COLUMN id_new TO id;
ALTER TABLE registration_attempts ADD PRIMARY KEY (id);

-- Re-add foreign keys
ALTER TABLE vents
  ADD CONSTRAINT vents_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  ADD CONSTRAINT vents_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES media_assets(id) ON DELETE SET NULL;

ALTER TABLE vent_tags
  ADD CONSTRAINT vent_tags_vent_id_fkey FOREIGN KEY (vent_id) REFERENCES vents(id) ON DELETE CASCADE,
  ADD CONSTRAINT vent_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES mood_tags(id) ON DELETE CASCADE;

ALTER TABLE reactions
  ADD CONSTRAINT reactions_vent_id_fkey FOREIGN KEY (vent_id) REFERENCES vents(id) ON DELETE CASCADE,
  ADD CONSTRAINT reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX reactions_vent_user_emoji_unique
  ON reactions (vent_id, user_id, emoji);

ALTER TABLE vent_comments
  ADD CONSTRAINT vent_comments_vent_id_fkey FOREIGN KEY (vent_id) REFERENCES vents(id) ON DELETE CASCADE,
  ADD CONSTRAINT vent_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  ADD CONSTRAINT vent_comments_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES media_assets(id) ON DELETE SET NULL;

ALTER TABLE user_feedback
  ADD CONSTRAINT user_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  ADD CONSTRAINT user_feedback_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES users(id);

CREATE UNIQUE INDEX user_feedback_one_per_user_per_day
  ON user_feedback (user_id, feedback_date);

ALTER TABLE admin_audit_log
  ADD CONSTRAINT admin_audit_log_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES users(id);

-- Public id format checks
ALTER TABLE users ADD CONSTRAINT users_id_format CHECK (id ~ '^[a-z][a-z0-9]{2,11}$');
ALTER TABLE mood_tags ADD CONSTRAINT mood_tags_id_format CHECK (id ~ '^[a-z][a-z0-9]{2,11}$');
ALTER TABLE media_assets ADD CONSTRAINT media_assets_id_format CHECK (id ~ '^[a-z][a-z0-9]{2,11}$');
ALTER TABLE vents ADD CONSTRAINT vents_id_format CHECK (id ~ '^[a-z][a-z0-9]{2,11}$');
ALTER TABLE vent_comments ADD CONSTRAINT vent_comments_id_format CHECK (id ~ '^[a-z][a-z0-9]{2,11}$');
ALTER TABLE reactions ADD CONSTRAINT reactions_id_format CHECK (id ~ '^[a-z][a-z0-9]{2,11}$');
ALTER TABLE user_feedback ADD CONSTRAINT user_feedback_id_format CHECK (id ~ '^[a-z][a-z0-9]{2,11}$');
ALTER TABLE admin_audit_log ADD CONSTRAINT admin_audit_log_id_format CHECK (id ~ '^[a-z][a-z0-9]{2,11}$');
ALTER TABLE login_attempts ADD CONSTRAINT login_attempts_id_format CHECK (id ~ '^[a-z][a-z0-9]{2,11}$');
ALTER TABLE registration_attempts ADD CONSTRAINT registration_attempts_id_format CHECK (id ~ '^[a-z][a-z0-9]{2,11}$');

DROP FUNCTION public_id_from_uuid(TEXT, UUID);