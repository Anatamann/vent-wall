-- Cap how many times an OP can edit a vent while it is on the Wall.

ALTER TABLE vents
  ADD COLUMN IF NOT EXISTS edit_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE vents DROP CONSTRAINT IF EXISTS vents_edit_count_nonneg;
ALTER TABLE vents
  ADD CONSTRAINT vents_edit_count_nonneg CHECK (edit_count >= 0);

COMMENT ON COLUMN vents.edit_count IS
  'Number of successful OP edits. Hard-capped by MAX_VENT_EDITS on the API.';
