/**
 * Seed ~3 days of geolocated globe sample vents (idempotent upsert).
 *
 * Timeline (relative to now on each run):
 *   Day 0  — last 0–18h   → active wall + default globe (hours=24)
 *   Day 1  — 24–42h ago   → globe when hours≥48
 *   Day 2  — 48–66h ago   → globe when hours≥72
 *
 * All vents get expire_at = now + 24h so the wall stays full after re-seed.
 * Re-run anytime to refresh timestamps for another demo window.
 *
 * Local:
 *   npm run seed:globe:3day --prefix server
 *   npm run db:seed:globe:3day
 *
 * Docker (stack stays up — see file footer / README):
 *   docker compose exec -T postgres psql -U ventwall -d ventwall < db/seeds/globe-3day.sql
 *   # or after api image includes this script:
 *   docker compose exec api node dist/scripts/seed-globe-3day.js
 */
import dotenv from 'dotenv'
import { pool, query } from '../db.js'

dotenv.config()

interface Loc {
  countryCode: string
  country: string
  state: string | null
  city: string | null
  lat: number
  lng: number
}

const LOCATIONS: Loc[] = [
  {
    countryCode: 'US',
    country: 'United States',
    state: 'California',
    city: 'Los Angeles',
    lat: 34.05,
    lng: -118.24,
  },
  {
    countryCode: 'US',
    country: 'United States',
    state: 'New York',
    city: 'New York',
    lat: 40.71,
    lng: -74.01,
  },
  {
    countryCode: 'US',
    country: 'United States',
    state: 'Texas',
    city: 'Austin',
    lat: 30.27,
    lng: -97.74,
  },
  {
    countryCode: 'US',
    country: 'United States',
    state: 'Washington',
    city: 'Seattle',
    lat: 47.61,
    lng: -122.33,
  },
  {
    countryCode: 'CA',
    country: 'Canada',
    state: 'Ontario',
    city: 'Toronto',
    lat: 43.65,
    lng: -79.38,
  },
  {
    countryCode: 'GB',
    country: 'United Kingdom',
    state: 'England',
    city: 'London',
    lat: 51.51,
    lng: -0.13,
  },
  {
    countryCode: 'IN',
    country: 'India',
    state: 'Maharashtra',
    city: 'Mumbai',
    lat: 19.08,
    lng: 72.88,
  },
  {
    countryCode: 'AU',
    country: 'Australia',
    state: 'New South Wales',
    city: 'Sydney',
    lat: -33.87,
    lng: 151.21,
  },
  {
    countryCode: 'DE',
    country: 'Germany',
    state: null,
    city: 'Berlin',
    lat: 52.52,
    lng: 13.41,
  },
  {
    countryCode: 'JP',
    country: 'Japan',
    state: null,
    city: 'Tokyo',
    lat: 35.68,
    lng: 139.69,
  },
]

/** Dominant mood themes per day (plus fillers for realism). */
const DAY_THEMES: Array<{
  day: number
  /** Hours ago for the newest vent in this day wave. */
  baseHoursAgo: number
  label: string
  primaryTags: string[]
  secondaryTags: string[]
  ventsPerRegion: number
  snippets: string[]
}> = [
  {
    day: 0,
    baseHoursAgo: 0.5,
    label: 'today',
    primaryTags: ['Anxious', 'Hopeful', 'Motivated'],
    secondaryTags: ['Calm', 'Excited', 'Work Rant', 'Grateful'],
    ventsPerRegion: 6,
    snippets: [
      'Monday energy is loud and my calendar is louder.',
      'Tiny win at lunch — sharing so I remember it happened.',
      'Need one deep breath and maybe three.',
      'City lights look kinder when I put the phone down.',
      'Still here, still trying, still human.',
      'Plot twist: the walk outside actually helped.',
      'Brain tab count: 47. Closing some of them now.',
      'Coffee #2 and a little courage.',
    ],
  },
  {
    day: 1,
    baseHoursAgo: 25,
    label: 'yesterday',
    primaryTags: ['Burnout', 'Frustrated', 'Sad'],
    secondaryTags: ['Lonely', 'Overthinking', 'Peaceful', 'Happy'],
    ventsPerRegion: 5,
    snippets: [
      'Yesterday dragged; writing it down so it stops circling.',
      'Said less in meetings. Felt more like myself.',
      'Rain on the window matched the mood.',
      'Texted a friend instead of doomscrolling. Progress.',
      'Tired in a bone-deep way, not a lazy way.',
      'Found a quiet hour and guarded it fiercely.',
      'The day ended softer than it started.',
    ],
  },
  {
    day: 2,
    baseHoursAgo: 49,
    label: 'two-days-ago',
    primaryTags: ['Grateful', 'Nostalgic', 'Calm'],
    secondaryTags: ['Happy', 'Dreaming', 'Excited', 'Peaceful'],
    ventsPerRegion: 5,
    snippets: [
      'Looking back two days: not perfect, still proud.',
      'Old song, new feelings. Time does weird math.',
      'Grateful for the small ordinary kindnesses.',
      'Missed someone without making it a whole crisis.',
      'Slow morning energy still lingering in the notes app.',
      'That conversation deserved a longer seat at the table.',
      'Archive mood: soft edges, no sharp deadlines.',
    ],
  },
]

const USER_IDS = ['u01', 'u02', 'u03', 'u04', 'u05', 'u06', 'u07', 'u08', 'u09'] as const

/** Valid 8-char slugs (alphabet a-hjkmnp-z2-9). Deterministic for upsert stability. */
function slugFor(index: number): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  let n = index + 1000
  let out = 'g3'
  for (let i = 0; i < 6; i++) {
    out += alphabet[n % alphabet.length]
    n = Math.floor(n / alphabet.length) + i * 7 + 3
  }
  return out
}

function ventId(day: number, regionIdx: number, ventIdx: number): string {
  // max 12 chars: g3d0r00v0 style → g3 + day + r + rr + v + vv
  return `g3d${day}r${regionIdx}v${ventIdx}`
}

async function seedGlobe3Day() {
  const tagRows = await query<{ id: string; name: string }>('SELECT id, name FROM mood_tags')
  if (tagRows.rows.length === 0) {
    throw new Error('No mood tags found. Run primary seed first (demo tags).')
  }
  const tagByName = Object.fromEntries(tagRows.rows.map((t) => [t.name, t.id]))

  const userCheck = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM users WHERE id = ANY($1::text[])`,
    [USER_IDS as unknown as string[]]
  )
  if ((userCheck.rows[0]?.count ?? 0) < 5) {
    throw new Error('Demo users missing. Run primary seed first (u01…u09 / demo).')
  }

  const wallExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  let ventsUpserted = 0
  let tagsLinked = 0
  let slugIndex = 0

  for (const theme of DAY_THEMES) {
    for (let r = 0; r < LOCATIONS.length; r++) {
      const loc = LOCATIONS[r]
      for (let v = 0; v < theme.ventsPerRegion; v++) {
        const id = ventId(theme.day, r, v)
        const slug = slugFor(slugIndex++)
        const userId = USER_IDS[(r + v + theme.day) % USER_IDS.length]
        const hoursAgo = theme.baseHoursAgo + v * 2.5 + (r % 3) * 0.4
        const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()

        const primary = theme.primaryTags[v % theme.primaryTags.length]
        const secondary = theme.secondaryTags[(v + r) % theme.secondaryTags.length]
        const tags = primary === secondary ? [primary] : [primary, secondary]
        for (const name of tags) {
          if (!tagByName[name]) {
            throw new Error(`Unknown mood tag "${name}" — run primary mood seed first.`)
          }
        }

        const snippet = theme.snippets[(v + r) % theme.snippets.length]
        const place = loc.city || loc.state || loc.country
        const content = `[${theme.label}] ${place}: ${snippet}`.slice(0, 500)

        await query(
          `INSERT INTO vents (
             id, user_id, content, slug, created_at, expires_at,
             contribute_to_globe,
             location_country_code, location_country, location_state, location_city,
             location_lat, location_lng
           ) VALUES (
             $1, $2, $3, $4, $5, $6,
             true,
             $7, $8, $9, $10,
             $11, $12
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
             location_lng = EXCLUDED.location_lng`,
          [
            id,
            userId,
            content,
            slug,
            createdAt,
            wallExpiresAt,
            loc.countryCode,
            loc.country,
            loc.state,
            loc.city,
            loc.lat,
            loc.lng,
          ]
        )
        ventsUpserted++

        await query('DELETE FROM vent_tags WHERE vent_id = $1', [id])
        for (const tagName of tags) {
          await query(
            `INSERT INTO vent_tags (vent_id, tag_id) VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [id, tagByName[tagName]]
          )
          tagsLinked++
        }
      }
    }
  }

  // Light engagement on a few day-0 vents
  const sampleReactions = [
    { id: 'rg3d01', vent_id: ventId(0, 0, 0), user_id: 'u09', emoji: '🫂' },
    { id: 'rg3d02', vent_id: ventId(0, 1, 0), user_id: 'u08', emoji: '❤️' },
    { id: 'rg3d03', vent_id: ventId(0, 5, 1), user_id: 'u01', emoji: '🔥' },
    { id: 'rg3d04', vent_id: ventId(0, 6, 2), user_id: 'u02', emoji: '💪' },
    { id: 'rg3d05', vent_id: ventId(0, 7, 0), user_id: 'u03', emoji: '🙏' },
  ]
  let reactionsAdded = 0
  for (const reaction of sampleReactions) {
    const result = await query(
      `INSERT INTO reactions (id, vent_id, user_id, emoji)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (vent_id, user_id, emoji) DO NOTHING
       RETURNING id`,
      [reaction.id, reaction.vent_id, reaction.user_id, reaction.emoji]
    )
    if (result.rowCount) reactionsAdded++
  }

  const byDay = await query<{ day_bucket: string; n: number }>(
    `SELECT
       CASE
         WHEN created_at > now() - interval '24 hours' THEN 'day0_last_24h'
         WHEN created_at > now() - interval '48 hours' THEN 'day1_24_48h'
         ELSE 'day2_48_72h'
       END AS day_bucket,
       COUNT(*)::int AS n
     FROM vents
     WHERE id LIKE 'g3d%'
     GROUP BY 1
     ORDER BY 1`
  )

  const regions = await query<{ region: string; n: number }>(
    `SELECT
       COALESCE(location_country_code, '?') || ':' || COALESCE(location_state, '_country') AS region,
       COUNT(*)::int AS n
     FROM vents
     WHERE id LIKE 'g3d%'
       AND contribute_to_globe = true
       AND created_at > now() - interval '24 hours'
     GROUP BY 1
     ORDER BY n DESC`
  )

  console.log('3-day globe seed complete')
  console.log(`  Vents upserted: ${ventsUpserted}`)
  console.log(`  Tag links written: ${tagsLinked}`)
  console.log(`  Reactions added: ${reactionsAdded}`)
  console.log('  By age bucket:')
  for (const row of byDay.rows) {
    console.log(`    ${row.day_bucket} → ${row.n}`)
  }
  console.log('  Regions active in last 24h:')
  for (const row of regions.rows) {
    console.log(`    ${row.region} → ${row.n}`)
  }
  console.log('  Tip: default globe uses hours=24 (day 0). Try API ?hours=72 for all 3 days.')

  await pool.end()
}

seedGlobe3Day().catch(async (err) => {
  console.error('3-day globe seed failed:', err)
  await pool.end().catch(() => {})
  process.exit(1)
})
