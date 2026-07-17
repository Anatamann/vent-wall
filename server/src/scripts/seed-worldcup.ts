/**
 * Seed 5 sample World Cup support wall posts with real ISP-style geo.
 *
 * Usage:
 *   npm run seed:worldcup --prefix server
 *   # from repo root:
 *   npm run db:seed:worldcup
 *
 * Safe to re-run: upserts by fixed ids sw01…sw05.
 */
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import { pool, query } from '../db.js'

dotenv.config()

const DEMO_PASSWORD = 'demo123'

/** Fans used only for sample wall posts (short public ids). */
const WC_USERS = [
  { id: 'u01', username: 'mindful_soul', email: 'mindful@ventwall.local' },
  { id: 'u02', username: 'night_thinker', email: 'night@ventwall.local' },
  { id: 'u03', username: 'coffee_dreamer', email: 'coffee@ventwall.local' },
  { id: 'u04', username: 'ocean_waves', email: 'ocean@ventwall.local' },
  { id: 'u05', username: 'city_wanderer', email: 'city@ventwall.local' },
]

interface Loc {
  countryCode: string
  country: string
  state: string | null
  city: string | null
  lat: number
  lng: number
}

/** Real city centers (approx., ~2 decimal places like production geo). */
const LOC = {
  madrid: {
    countryCode: 'ES',
    country: 'Spain',
    state: 'Community of Madrid',
    city: 'Madrid',
    lat: 40.42,
    lng: -3.7,
  },
  buenosAires: {
    countryCode: 'AR',
    country: 'Argentina',
    state: 'Buenos Aires',
    city: 'Buenos Aires',
    lat: -34.6,
    lng: -58.38,
  },
  mexicoCity: {
    countryCode: 'MX',
    country: 'Mexico',
    state: 'Mexico City',
    city: 'Mexico City',
    lat: 19.43,
    lng: -99.13,
  },
  miami: {
    countryCode: 'US',
    country: 'United States',
    state: 'Florida',
    city: 'Miami',
    lat: 25.76,
    lng: -80.19,
  },
  london: {
    countryCode: 'GB',
    country: 'United Kingdom',
    state: 'England',
    city: 'London',
    lat: 51.51,
    lng: -0.13,
  },
} as const satisfies Record<string, Loc>

type SeedPost = {
  id: string
  ballotId: string
  userId: string
  teamId: 'spain' | 'argentina'
  content: string
  hoursAgo: number
  location: Loc
}

const POSTS: SeedPost[] = [
  {
    id: 'sw01',
    ballotId: 'seed-ballot-sw01-spain-madrid',
    userId: 'u01',
    teamId: 'spain',
    content:
      'Watching from Madrid — the whole city is red and gold tonight. Vamos España! 🇪🇸',
    hoursAgo: 2,
    location: LOC.madrid,
  },
  {
    id: 'sw02',
    ballotId: 'seed-ballot-sw02-arg-bsas',
    userId: 'u02',
    teamId: 'argentina',
    content:
      'Buenos Aires is loud and proud. Messi generation forever. Dale campeón 🇦🇷',
    hoursAgo: 3,
    location: LOC.buenosAires,
  },
  {
    id: 'sw03',
    ballotId: 'seed-ballot-sw03-spain-mx',
    userId: 'u03',
    teamId: 'spain',
    content:
      'CDMX fan of La Roja since 2010. Tiki-taka in my veins — Spain to lift the cup!',
    hoursAgo: 5,
    location: LOC.mexicoCity,
  },
  {
    id: 'sw04',
    ballotId: 'seed-ballot-sw04-arg-miami',
    userId: 'u04',
    teamId: 'argentina',
    content:
      'Miami has so many Albiceleste shirts right now. Finals energy is real 🔵⚪',
    hoursAgo: 8,
    location: LOC.miami,
  },
  {
    id: 'sw05',
    ballotId: 'seed-ballot-sw05-spain-london',
    userId: 'u05',
    teamId: 'spain',
    content:
      'Cheering from London pubs — Spain’s midfield will control this final. Come on!',
    hoursAgo: 12,
    location: LOC.london,
  },
]

async function ensureUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  for (const u of WC_USERS) {
    await query(
      `INSERT INTO users (id, username, email, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         username = EXCLUDED.username,
         email = EXCLUDED.email`,
      [u.id, u.username, u.email, passwordHash]
    )
  }
}

async function ensureTeams() {
  await query(
    `INSERT INTO worldcup_teams (id, name, emoji, color) VALUES
       ('spain', 'Spain', '🇪🇸', '#C60B1E'),
       ('argentina', 'Argentina', '🇦🇷', '#74ACDF')
     ON CONFLICT (id) DO NOTHING`
  )
}

async function seedPosts() {
  for (const post of POSTS) {
    const createdAt = new Date(Date.now() - post.hoursAgo * 60 * 60 * 1000)
    const loc = post.location

    await query(
      `INSERT INTO worldcup_supports (
         id, ballot_id, user_id, team_id, content,
         is_wall_post, contribute_to_globe,
         location_country_code, location_country, location_state, location_city,
         location_lat, location_lng, ip_hash,
         created_at, wall_published_at
       ) VALUES (
         $1, $2, $3, $4, $5,
         true, true,
         $6, $7, $8, $9,
         $10, $11, $12,
         $13, $13
       )
       ON CONFLICT (id) DO UPDATE SET
         ballot_id = EXCLUDED.ballot_id,
         user_id = EXCLUDED.user_id,
         team_id = EXCLUDED.team_id,
         content = EXCLUDED.content,
         is_wall_post = true,
         contribute_to_globe = true,
         location_country_code = EXCLUDED.location_country_code,
         location_country = EXCLUDED.location_country,
         location_state = EXCLUDED.location_state,
         location_city = EXCLUDED.location_city,
         location_lat = EXCLUDED.location_lat,
         location_lng = EXCLUDED.location_lng,
         created_at = EXCLUDED.created_at,
         wall_published_at = EXCLUDED.wall_published_at`,
      [
        post.id,
        post.ballotId,
        post.userId,
        post.teamId,
        post.content,
        loc.countryCode,
        loc.country,
        loc.state,
        loc.city,
        loc.lat,
        loc.lng,
        `seed-ip-${post.id}`,
        createdAt.toISOString(),
      ]
    )

    console.log(
      `  ${post.id}  ${post.teamId.padEnd(10)}  ${loc.city}, ${loc.country}  (${loc.lat}, ${loc.lng})`
    )
  }
}

async function main() {
  console.log('Seeding World Cup sample posts (5 wall posts + real geo)…')
  await ensureTeams()
  await ensureUsers()
  await seedPosts()

  const stats = await query<{ team_id: string; votes: number }>(
    `SELECT team_id, COUNT(*)::int AS votes FROM worldcup_supports GROUP BY team_id ORDER BY team_id`
  )
  const regions = await query<{ region: string; n: number }>(
    `SELECT COALESCE(location_state, location_country, location_country_code) AS region,
            COUNT(*)::int AS n
     FROM worldcup_supports
     WHERE contribute_to_globe AND location_lat IS NOT NULL
     GROUP BY 1
     ORDER BY n DESC`
  )

  console.log('\nVote totals:')
  for (const row of stats.rows) {
    console.log(`  ${row.team_id}: ${row.votes}`)
  }
  console.log('\nGlobe regions with coords:')
  for (const row of regions.rows) {
    console.log(`  ${row.region}: ${row.n}`)
  }
  console.log('\nDone. Open /worldcup (Wall + Globe). Demo users password: demo123')
}

main()
  .catch((err) => {
    console.error('World Cup seed failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
