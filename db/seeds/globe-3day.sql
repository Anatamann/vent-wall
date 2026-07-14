-- 3-day geolocated globe sample data (idempotent).
-- Safe to re-run while containers are up — only writes to Postgres.
--
-- Apply without stopping the stack:
--   docker compose exec -T postgres psql -U ventwall -d ventwall -v ON_ERROR_STOP=1 < db/seeds/globe-3day.sql
-- VPS dual-file compose (same idea):
--   docker compose -f docker-compose.yml -f docker-compose.vps.yml exec -T postgres \
--     psql -U ventwall -d ventwall -v ON_ERROR_STOP=1 < db/seeds/globe-3day.sql
--
-- Requires demo users (u01…) and mood_tags from primary seed.
-- Timeline: day0 last ~18h, day1 ~25–42h ago, day2 ~49–66h ago.
-- expires_at = now() + 24h so wall stays populated after each re-seed.

BEGIN;

DO $$
DECLARE
  demo_users int;
  tag_count int;
BEGIN
  SELECT COUNT(*)::int INTO demo_users FROM users WHERE id IN ('u01','u02','u03','u04','u05','u06','u07','u08','u09');
  IF demo_users < 5 THEN
    RAISE EXCEPTION 'Demo users missing. Run primary seed first (u01…u09).';
  END IF;
  SELECT COUNT(*)::int INTO tag_count FROM mood_tags;
  IF tag_count < 10 THEN
    RAISE EXCEPTION 'mood_tags empty. Run primary seed first.';
  END IF;
END $$;

-- Helper: upsert one vent + tags by name
CREATE TEMP TABLE _g3_locs (
  idx int PRIMARY KEY,
  country_code text,
  country text,
  state text,
  city text,
  lat double precision,
  lng double precision
);

INSERT INTO _g3_locs (idx, country_code, country, state, city, lat, lng) VALUES
  (0, 'US', 'United States', 'California', 'Los Angeles', 34.05, -118.24),
  (1, 'US', 'United States', 'New York', 'New York', 40.71, -74.01),
  (2, 'US', 'United States', 'Texas', 'Austin', 30.27, -97.74),
  (3, 'US', 'United States', 'Washington', 'Seattle', 47.61, -122.33),
  (4, 'CA', 'Canada', 'Ontario', 'Toronto', 43.65, -79.38),
  (5, 'GB', 'United Kingdom', 'England', 'London', 51.51, -0.13),
  (6, 'IN', 'India', 'Maharashtra', 'Mumbai', 19.08, 72.88),
  (7, 'AU', 'Australia', 'New South Wales', 'Sydney', -33.87, 151.21),
  (8, 'DE', 'Germany', NULL, 'Berlin', 52.52, 13.41),
  (9, 'JP', 'Japan', NULL, 'Tokyo', 35.68, 139.69);

CREATE TEMP TABLE _g3_days (
  day int PRIMARY KEY,
  base_hours numeric,
  label text,
  primary_tags text[],
  secondary_tags text[],
  vents_per_region int,
  snippets text[]
);

INSERT INTO _g3_days (day, base_hours, label, primary_tags, secondary_tags, vents_per_region, snippets) VALUES
  (0, 0.5, 'today',
   ARRAY['Anxious','Hopeful','Motivated'],
   ARRAY['Calm','Excited','Work Rant','Grateful'],
   6,
   ARRAY[
     'Monday energy is loud and my calendar is louder.',
     'Tiny win at lunch — sharing so I remember it happened.',
     'Need one deep breath and maybe three.',
     'City lights look kinder when I put the phone down.',
     'Still here, still trying, still human.',
     'Plot twist: the walk outside actually helped.',
     'Brain tab count: 47. Closing some of them now.',
     'Coffee #2 and a little courage.'
   ]),
  (1, 25, 'yesterday',
   ARRAY['Burnout','Frustrated','Sad'],
   ARRAY['Lonely','Overthinking','Peaceful','Happy'],
   5,
   ARRAY[
     'Yesterday dragged; writing it down so it stops circling.',
     'Said less in meetings. Felt more like myself.',
     'Rain on the window matched the mood.',
     'Texted a friend instead of doomscrolling. Progress.',
     'Tired in a bone-deep way, not a lazy way.',
     'Found a quiet hour and guarded it fiercely.',
     'The day ended softer than it started.'
   ]),
  (2, 49, 'two-days-ago',
   ARRAY['Grateful','Nostalgic','Calm'],
   ARRAY['Happy','Dreaming','Excited','Peaceful'],
   5,
   ARRAY[
     'Looking back two days: not perfect, still proud.',
     'Old song, new feelings. Time does weird math.',
     'Grateful for the small ordinary kindnesses.',
     'Missed someone without making it a whole crisis.',
     'Slow morning energy still lingering in the notes app.',
     'That conversation deserved a longer seat at the table.',
     'Archive mood: soft edges, no sharp deadlines.'
   ]);

DO $$
DECLARE
  d RECORD;
  loc RECORD;
  v int;
  vent_id text;
  slug text;
  user_id text;
  hours_ago numeric;
  created_at timestamptz;
  expires_at timestamptz := now() + interval '24 hours';
  primary_tag text;
  secondary_tag text;
  content text;
  place text;
  users text[] := ARRAY['u01','u02','u03','u04','u05','u06','u07','u08','u09'];
  slug_i int := 1000;
  alphabet text := 'abcdefghjkmnpqrstuvwxyz23456789';
  n int;
  i int;
  ch text;
  tag_id_primary text;
  tag_id_secondary text;
  vents_n int := 0;
BEGIN
  FOR d IN SELECT * FROM _g3_days ORDER BY day LOOP
    FOR loc IN SELECT * FROM _g3_locs ORDER BY idx LOOP
      FOR v IN 0..(d.vents_per_region - 1) LOOP
        vent_id := 'g3d' || d.day || 'r' || loc.idx || 'v' || v;
        -- deterministic 8-char slug
        n := slug_i;
        slug := 'g3';
        FOR i IN 0..5 LOOP
          ch := substr(alphabet, (n % length(alphabet)) + 1, 1);
          slug := slug || ch;
          n := (n / length(alphabet))::int + i * 7 + 3;
        END LOOP;
        slug_i := slug_i + 1;

        user_id := users[1 + ((loc.idx + v + d.day) % array_length(users, 1))];
        hours_ago := d.base_hours + v * 2.5 + (loc.idx % 3) * 0.4;
        created_at := now() - (hours_ago || ' hours')::interval;

        primary_tag := d.primary_tags[1 + (v % array_length(d.primary_tags, 1))];
        secondary_tag := d.secondary_tags[1 + ((v + loc.idx) % array_length(d.secondary_tags, 1))];

        place := COALESCE(loc.city, loc.state, loc.country);
        content := left(
          '[' || d.label || '] ' || place || ': ' ||
          d.snippets[1 + ((v + loc.idx) % array_length(d.snippets, 1))],
          500
        );

        INSERT INTO vents (
          id, user_id, content, slug, created_at, expires_at,
          contribute_to_globe,
          location_country_code, location_country, location_state, location_city,
          location_lat, location_lng
        ) VALUES (
          vent_id, user_id, content, slug, created_at, expires_at,
          true,
          loc.country_code, loc.country, loc.state, loc.city,
          loc.lat, loc.lng
        )
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          slug = EXCLUDED.slug,
          created_at = EXCLUDED.created_at,
          expires_at = EXCLUDED.expires_at,
          contribute_to_globe = true,
          location_country_code = EXCLUDED.location_country_code,
          location_country = EXCLUDED.location_country,
          location_state = EXCLUDED.location_state,
          location_city = EXCLUDED.location_city,
          location_lat = EXCLUDED.location_lat,
          location_lng = EXCLUDED.location_lng;

        DELETE FROM vent_tags WHERE vent_tags.vent_id = vent_id;

        SELECT id INTO tag_id_primary FROM mood_tags WHERE name = primary_tag;
        IF tag_id_primary IS NULL THEN
          RAISE EXCEPTION 'Missing mood tag: %', primary_tag;
        END IF;
        INSERT INTO vent_tags (vent_id, tag_id) VALUES (vent_id, tag_id_primary)
        ON CONFLICT DO NOTHING;

        IF secondary_tag IS DISTINCT FROM primary_tag THEN
          SELECT id INTO tag_id_secondary FROM mood_tags WHERE name = secondary_tag;
          IF tag_id_secondary IS NULL THEN
            RAISE EXCEPTION 'Missing mood tag: %', secondary_tag;
          END IF;
          INSERT INTO vent_tags (vent_id, tag_id) VALUES (vent_id, tag_id_secondary)
          ON CONFLICT DO NOTHING;
        END IF;

        vents_n := vents_n + 1;
      END LOOP;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'globe-3day seed: % vents upserted', vents_n;
END $$;

-- Light engagement (ignore if users/vents conflict)
INSERT INTO reactions (id, vent_id, user_id, emoji) VALUES
  ('rg3d01', 'g3d0r0v0', 'u09', '🫂'),
  ('rg3d02', 'g3d0r1v0', 'u08', '❤️'),
  ('rg3d03', 'g3d0r5v1', 'u01', '🔥'),
  ('rg3d04', 'g3d0r6v2', 'u02', '💪'),
  ('rg3d05', 'g3d0r7v0', 'u03', '🙏')
ON CONFLICT (vent_id, user_id, emoji) DO NOTHING;

-- Summary
SELECT
  CASE
    WHEN created_at > now() - interval '24 hours' THEN 'day0_last_24h'
    WHEN created_at > now() - interval '48 hours' THEN 'day1_24_48h'
    ELSE 'day2_48_72h'
  END AS day_bucket,
  COUNT(*)::int AS n
FROM vents
WHERE id LIKE 'g3d%'
GROUP BY 1
ORDER BY 1;

SELECT
  COALESCE(location_country_code, '?') || ':' || COALESCE(location_state, '_country') AS region,
  COUNT(*)::int AS n
FROM vents
WHERE id LIKE 'g3d%'
  AND contribute_to_globe = true
  AND created_at > now() - interval '24 hours'
GROUP BY 1
ORDER BY n DESC;

COMMIT;
