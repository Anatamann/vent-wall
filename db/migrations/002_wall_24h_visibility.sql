-- Wall visibility: vents leave the public wall 24 hours after creation.
-- Owners keep access in their profile until they delete the vent.

ALTER TABLE vents
  ALTER COLUMN expires_at SET DEFAULT (now() + INTERVAL '24 hours');

COMMENT ON COLUMN vents.expires_at IS
  'Timestamp when the vent leaves the public wall (created_at + 24h). The owner can still view it in their profile until deleted.';

UPDATE vents
SET expires_at = created_at + INTERVAL '24 hours'
WHERE expires_at > created_at + INTERVAL '24 hours';