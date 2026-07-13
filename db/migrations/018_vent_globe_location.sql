-- Vent Globe: approximate ISP location + opt-in visibility flag.
-- Raw IP is never stored on vents; only rounded geo fields are persisted.

ALTER TABLE vents
  ADD COLUMN IF NOT EXISTS contribute_to_globe BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS location_country_code TEXT,
  ADD COLUMN IF NOT EXISTS location_country TEXT,
  ADD COLUMN IF NOT EXISTS location_state TEXT,
  ADD COLUMN IF NOT EXISTS location_city TEXT,
  ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;

COMMENT ON COLUMN vents.contribute_to_globe IS
  'When true, vent may appear on the Global Mood Globe. Location is still resolved server-side for backend use.';
COMMENT ON COLUMN vents.location_lat IS
  'Approximate latitude from ISP geolocation, rounded (~1km). Not exact user position.';
COMMENT ON COLUMN vents.location_lng IS
  'Approximate longitude from ISP geolocation, rounded (~1km). Not exact user position.';

-- Hot path for globe aggregation (last-24h contribute vents with coords)
CREATE INDEX IF NOT EXISTS idx_vents_globe_contribute_created
  ON vents (created_at DESC)
  WHERE contribute_to_globe = true
    AND location_lat IS NOT NULL
    AND location_lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vents_globe_region
  ON vents (location_country_code, location_state, created_at DESC)
  WHERE contribute_to_globe = true;
