-- One immutable ballot-backed vote per registered user (when user_id is set).
-- Extra wall posts use ballot_id IS NULL and are not constrained here.

CREATE UNIQUE INDEX IF NOT EXISTS idx_wc_supports_one_vote_per_user
  ON worldcup_supports (user_id)
  WHERE user_id IS NOT NULL AND ballot_id IS NOT NULL;

COMMENT ON INDEX idx_wc_supports_one_vote_per_user IS
  'Logged-in users may own at most one World Cup vote (ballot-backed row). Team cannot be changed.';
