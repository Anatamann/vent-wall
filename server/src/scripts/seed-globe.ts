/**
 * Seed sample vents for Vent Globe testing.
 *
 * Creates ~45 recent contribute_to_globe vents across several regions so you can
 * exercise dominating emotion, empty markers, glass popups, and mood filters.
 *
 * Usage:
 *   npm run seed:globe --prefix server
 *   # or from repo root:
 *   npm run db:seed:globe
 *
 * Safe to re-run: upserts by fixed public ids (vg01…).
 */
import dotenv from 'dotenv'
import { pool, query } from '../db.js'
import { getWallExpiresAt } from '../utils/wall.js'

dotenv.config()

interface Loc {
  countryCode: string
  country: string
  state: string | null
  city: string | null
  lat: number
  lng: number
}

const LOC = {
  california: {
    countryCode: 'US',
    country: 'United States',
    state: 'California',
    city: 'Los Angeles',
    lat: 34.05,
    lng: -118.24,
  },
  newYork: {
    countryCode: 'US',
    country: 'United States',
    state: 'New York',
    city: 'New York',
    lat: 40.71,
    lng: -74.01,
  },
  texas: {
    countryCode: 'US',
    country: 'United States',
    state: 'Texas',
    city: 'Austin',
    lat: 30.27,
    lng: -97.74,
  },
  florida: {
    countryCode: 'US',
    country: 'United States',
    state: 'Florida',
    city: 'Miami',
    lat: 25.76,
    lng: -80.19,
  },
  washington: {
    countryCode: 'US',
    country: 'United States',
    state: 'Washington',
    city: 'Seattle',
    lat: 47.61,
    lng: -122.33,
  },
  ontario: {
    countryCode: 'CA',
    country: 'Canada',
    state: 'Ontario',
    city: 'Toronto',
    lat: 43.65,
    lng: -79.38,
  },
  england: {
    countryCode: 'GB',
    country: 'United Kingdom',
    state: 'England',
    city: 'London',
    lat: 51.51,
    lng: -0.13,
  },
  maharashtra: {
    countryCode: 'IN',
    country: 'India',
    state: 'Maharashtra',
    city: 'Mumbai',
    lat: 19.08,
    lng: 72.88,
  },
  nsw: {
    countryCode: 'AU',
    country: 'Australia',
    state: 'New South Wales',
    city: 'Sydney',
    lat: -33.87,
    lng: 151.21,
  },
  berlin: {
    countryCode: 'DE',
    country: 'Germany',
    state: null,
    city: 'Berlin',
    lat: 52.52,
    lng: 13.41,
  },
} as const satisfies Record<string, Loc>

type GlobeVentSeed = {
  id: string
  user_id: string
  content: string
  hoursAgo: number
  tags: string[]
  location: Loc
  contributeToGlobe?: boolean
}

/** Valid 8-char vent slugs (alphabet: a-hjkmnp-z2-9). One per globe sample vent. */
const GLOBE_SLUGS = [
  'a5ab7crw',
  'br99bvdt',
  '8c87kd6u',
  '9yb5uwtr',
  '6ka3yekn',
  '379z8x8j',
  '4t8xcbzf',
  'ze7vmusg',
  '226tvced',
  'xn5rzv7a',
  'u94p9du7',
  'vv3mdwm4',
  'sg2jne95',
  'p4zgsx22',
  'qq4e2bpx',
  'mb3caufu',
  'nx2aec4r',
  'jjzcpvvs',
  'f6yatdhp',
  'gsx83wak',
  'ddw6bexg',
  'ezv4fxqd',
  'bmu2qfce',
  '88tyuu5b',
  '9usw4cs8',
  '6fvu8vj5',
  '33usgd72',
  '4ptqrwy3',
  'zasnvemy',
  '2wrk5xdv',
  'xhqh9f2s',
  'u5pfhutt',
  'vrndscfq',
  'scmbwv8m',
  'pyk96dvh',
  'qfj7awne',
  'm3n5jeef',
  'npm3tx3c',
  'jak5xfu9',
  'fwj37ug6',
  'ghhzbc93',
  'd5gxkvw4',
  'erfvqdpz',
  'bcetywbw',
  '8ydr8e4t',
  '9kcpcxrq',
  '67fmmfhr',
  '3tejry6n',
  '4edgzcxj',
  'z2ce9vkf',
  '2nbcddcc',
] as const

/** Handful of vents per region — enough to show clear leads, close races, and early samples. */
const GLOBE_VENTS: GlobeVentSeed[] = [
  // ——— California: Anxious dominates (clear lead, ≥5 vents) ———
  {
    id: 'vg01',
    user_id: 'u01',
    content: 'Traffic and deadlines colliding again. My chest feels tight just thinking about Monday.',
    hoursAgo: 1,
    tags: ['Anxious'],
    location: LOC.california,
  },
  {
    id: 'vg02',
    user_id: 'u02',
    content: 'Can’t stop refreshing my inbox. Waiting for news that may never come.',
    hoursAgo: 2,
    tags: ['Anxious', 'Overthinking'],
    location: LOC.california,
  },
  {
    id: 'vg03',
    user_id: 'u03',
    content: 'Rent is due and my mind is doing gymnastics. Breathing helps… sometimes.',
    hoursAgo: 3,
    tags: ['Anxious', 'Overwhelmed'],
    location: LOC.california,
  },
  {
    id: 'vg04',
    user_id: 'u04',
    content: 'Golden hour on the coast finally slowed my pulse. California still knows how to heal.',
    hoursAgo: 4,
    tags: ['Calm', 'Grateful'],
    location: LOC.california,
  },
  {
    id: 'vg05',
    user_id: 'u05',
    content: 'Another pitch deck review. Why does ambition always feel like anxiety in a nicer shirt?',
    hoursAgo: 5,
    tags: ['Anxious', 'Ambitious'],
    location: LOC.california,
  },
  {
    id: 'vg06',
    user_id: 'u06',
    content: 'Skipped the gym three days straight. Guilt is loud tonight.',
    hoursAgo: 6,
    tags: ['Anxious'],
    location: LOC.california,
  },
  {
    id: 'vg07',
    user_id: 'u07',
    content: 'Hiked Runyon and remembered I have a body, not just a browser tab.',
    hoursAgo: 7,
    tags: ['Happy', 'Motivated'],
    location: LOC.california,
  },

  // ——— New York: close race Happy vs Excited (margin ≤10%) ———
  {
    id: 'vg08',
    user_id: 'u01',
    content: 'Subway serendipity: a stranger complimented my playlist. Tiny city magic.',
    hoursAgo: 1.5,
    tags: ['Happy'],
    location: LOC.newYork,
  },
  {
    id: 'vg09',
    user_id: 'u02',
    content: 'Got tickets to the show I never thought I’d afford. Screaming internally.',
    hoursAgo: 2.5,
    tags: ['Excited'],
    location: LOC.newYork,
  },
  {
    id: 'vg10',
    user_id: 'u03',
    content: 'Bagel that has no right to taste this good after a 12-hour shift.',
    hoursAgo: 3.5,
    tags: ['Happy', 'Grateful'],
    location: LOC.newYork,
  },
  {
    id: 'vg11',
    user_id: 'u04',
    content: 'First gallery opening of the season. My feet hurt and my heart is full.',
    hoursAgo: 4.5,
    tags: ['Excited', 'Happy'],
    location: LOC.newYork,
  },
  {
    id: 'vg12',
    user_id: 'u05',
    content: 'Rain on the fire escape. Somehow that still feels romantic.',
    hoursAgo: 5.5,
    tags: ['Happy', 'Nostalgic'],
    location: LOC.newYork,
  },
  {
    id: 'vg13',
    user_id: 'u06',
    content: 'New project greenlit. Sleep is optional; adrenaline is not.',
    hoursAgo: 6.5,
    tags: ['Excited', 'Motivated'],
    location: LOC.newYork,
  },
  {
    id: 'vg14',
    user_id: 'u07',
    content: 'Walked the High Line alone and didn’t feel lonely once.',
    hoursAgo: 8,
    tags: ['Peaceful', 'Happy'],
    location: LOC.newYork,
  },

  // ——— Texas: Frustrated leads clearly ———
  {
    id: 'vg15',
    user_id: 'u01',
    content: 'Construction on every route home. Austin traffic is a personality now.',
    hoursAgo: 2,
    tags: ['Frustrated'],
    location: LOC.texas,
  },
  {
    id: 'vg16',
    user_id: 'u02',
    content: 'Customer said “circle back” six times. I nearly orbitally left the call.',
    hoursAgo: 3,
    tags: ['Frustrated', 'Work Rant'],
    location: LOC.texas,
  },
  {
    id: 'vg17',
    user_id: 'u03',
    content: 'Power flickered during my presentation. Of course it did.',
    hoursAgo: 4,
    tags: ['Frustrated', 'Anxious'],
    location: LOC.texas,
  },
  {
    id: 'vg18',
    user_id: 'u04',
    content: 'BBQ fixed 40% of my mood. The other 60% is still in traffic.',
    hoursAgo: 5,
    tags: ['Frustrated', 'Happy'],
    location: LOC.texas,
  },
  {
    id: 'vg19',
    user_id: 'u05',
    content: 'Hot as the surface of the sun and my AC chose violence.',
    hoursAgo: 6,
    tags: ['Frustrated'],
    location: LOC.texas,
  },
  {
    id: 'vg20',
    user_id: 'u08',
    content: 'Wrote half a song about waiting rooms. Texas summer is a muse, unfortunately.',
    hoursAgo: 9,
    tags: ['Nostalgic'],
    location: LOC.texas,
  },

  // ——— Florida: early sample (only 2 vents → isReliable false) ———
  {
    id: 'vg21',
    user_id: 'u03',
    content: 'Ocean wind and no meetings. Temporary peace treaty with my brain.',
    hoursAgo: 2,
    tags: ['Calm', 'Peaceful'],
    location: LOC.florida,
  },
  {
    id: 'vg22',
    user_id: 'u04',
    content: 'Storm rolling in. I love the drama of Florida weather.',
    hoursAgo: 10,
    tags: ['Excited'],
    location: LOC.florida,
  },

  // ——— Washington: Burnout cluster ———
  {
    id: 'vg23',
    user_id: 'u05',
    content: 'Third coffee, zero dopamine. Seattle gray matches my calendar.',
    hoursAgo: 1,
    tags: ['Burnout'],
    location: LOC.washington,
  },
  {
    id: 'vg24',
    user_id: 'u06',
    content: 'Standups about standups. I need a soft reset, not another doc.',
    hoursAgo: 3,
    tags: ['Burnout', 'Work Rant'],
    location: LOC.washington,
  },
  {
    id: 'vg25',
    user_id: 'u07',
    content: 'Left the laptop at home and walked Pike Place like a tourist in my own city.',
    hoursAgo: 4,
    tags: ['Calm', 'Grateful'],
    location: LOC.washington,
  },
  {
    id: 'vg26',
    user_id: 'u08',
    content: 'Rain again. Body says sleep; backlog says no.',
    hoursAgo: 5,
    tags: ['Burnout', 'Overwhelmed'],
    location: LOC.washington,
  },
  {
    id: 'vg27',
    user_id: 'u01',
    content: 'Shipped the thing. Felt nothing. That scares me more than the bugs.',
    hoursAgo: 7,
    tags: ['Burnout', 'Dead Inside'],
    location: LOC.washington,
  },

  // ——— Ontario: Calm dominates ———
  {
    id: 'vg28',
    user_id: 'u02',
    content: 'Snow muffles the city. Toronto finally sounds like a whisper.',
    hoursAgo: 2,
    tags: ['Calm', 'Peaceful'],
    location: LOC.ontario,
  },
  {
    id: 'vg29',
    user_id: 'u03',
    content: 'Library afternoon. No notifications, just paper and quiet.',
    hoursAgo: 4,
    tags: ['Calm'],
    location: LOC.ontario,
  },
  {
    id: 'vg30',
    user_id: 'u04',
    content: 'Tea, playlist, and a long exhale. Needed this.',
    hoursAgo: 6,
    tags: ['Calm', 'Grateful'],
    location: LOC.ontario,
  },
  {
    id: 'vg31',
    user_id: 'u05',
    content: 'Commute rant cancelled — the streetcar was actually on time.',
    hoursAgo: 8,
    tags: ['Happy'],
    location: LOC.ontario,
  },
  {
    id: 'vg32',
    user_id: 'u06',
    content: 'Watched the lake freeze at the edges. Slow beauty.',
    hoursAgo: 11,
    tags: ['Peaceful', 'Calm'],
    location: LOC.ontario,
  },

  // ——— England: Work Rant leads ———
  {
    id: 'vg33',
    user_id: 'u07',
    content: 'Slack pings at 10pm “just a quick one”. It never is.',
    hoursAgo: 1,
    tags: ['Work Rant', 'Frustrated'],
    location: LOC.england,
  },
  {
    id: 'vg34',
    user_id: 'u08',
    content: 'Meeting that could have been a haiku. Instead: 47 slides.',
    hoursAgo: 3,
    tags: ['Work Rant', 'Sarcastic'],
    location: LOC.england,
  },
  {
    id: 'vg35',
    user_id: 'u01',
    content: 'Rain, bus, email, repeat. Classic London loop.',
    hoursAgo: 5,
    tags: ['Work Rant'],
    location: LOC.england,
  },
  {
    id: 'vg36',
    user_id: 'u02',
    content: 'Found a quiet corner in the park after stand-up. Briefly human again.',
    hoursAgo: 7,
    tags: ['Calm'],
    location: LOC.england,
  },
  {
    id: 'vg37',
    user_id: 'u03',
    content: 'Boss said “we’re a family” right before cutting headcount. Cool cool cool.',
    hoursAgo: 9,
    tags: ['Work Rant', 'Angry'],
    location: LOC.england,
  },

  // ——— Maharashtra: Motivated ———
  {
    id: 'vg38',
    user_id: 'u04',
    content: 'Local train chaos, but the pitch went well. Mumbai energy is a drug.',
    hoursAgo: 2,
    tags: ['Motivated', 'Excited'],
    location: LOC.maharashtra,
  },
  {
    id: 'vg39',
    user_id: 'u05',
    content: 'Building something small every morning before the city wakes up.',
    hoursAgo: 4,
    tags: ['Motivated', 'Ambitious'],
    location: LOC.maharashtra,
  },
  {
    id: 'vg40',
    user_id: 'u06',
    content: 'Monsoon rain on the window while I finish the draft. Feels like a film.',
    hoursAgo: 6,
    tags: ['Hopeful', 'Motivated'],
    location: LOC.maharashtra,
  },
  {
    id: 'vg41',
    user_id: 'u07',
    content: 'Street food victory after a long review. Simple joys.',
    hoursAgo: 8,
    tags: ['Happy', 'Grateful'],
    location: LOC.maharashtra,
  },
  {
    id: 'vg42',
    user_id: 'u08',
    content: 'Said no to a meeting that didn’t need me. Growth.',
    hoursAgo: 10,
    tags: ['Motivated', 'Calm'],
    location: LOC.maharashtra,
  },

  // ——— NSW: Grateful ———
  {
    id: 'vg43',
    user_id: 'u01',
    content: 'Harbour walk at dusk. Grateful I get to call this home for now.',
    hoursAgo: 3,
    tags: ['Grateful', 'Peaceful'],
    location: LOC.nsw,
  },
  {
    id: 'vg44',
    user_id: 'u02',
    content: 'Called mum. Said the things I usually leave unsaid.',
    hoursAgo: 5,
    tags: ['Grateful', 'Hopeful'],
    location: LOC.nsw,
  },
  {
    id: 'vg45',
    user_id: 'u03',
    content: 'Ocean pool, cold water, clear head. Ritual restored.',
    hoursAgo: 7,
    tags: ['Calm', 'Grateful'],
    location: LOC.nsw,
  },
  {
    id: 'vg46',
    user_id: 'u04',
    content: 'Friend showed up unannounced with coffee. That counts as therapy.',
    hoursAgo: 12,
    tags: ['Grateful', 'Happy'],
    location: LOC.nsw,
  },
  {
    id: 'vg47',
    user_id: 'u09',
    content: 'Demo globe check from Sydney. This view makes the feature feel real.',
    hoursAgo: 1,
    tags: ['Excited', 'Grateful'],
    location: LOC.nsw,
  },

  // ——— Germany country-level (no state) ———
  {
    id: 'vg48',
    user_id: 'u05',
    content: 'Berlin night bus and a playlist that understands me.',
    hoursAgo: 4,
    tags: ['Nostalgic', 'Lonely'],
    location: LOC.berlin,
  },
  {
    id: 'vg49',
    user_id: 'u06',
    content: 'Finally finished the side project README. Tiny win, big exhale.',
    hoursAgo: 6,
    tags: ['Motivated', 'Happy'],
    location: LOC.berlin,
  },
  {
    id: 'vg50',
    user_id: 'u07',
    content: 'Cold wind, warm bakery. Balance.',
    hoursAgo: 9,
    tags: ['Grateful', 'Calm'],
    location: LOC.berlin,
  },

  // Opt-out sample — should NOT appear on the globe
  {
    id: 'vg51',
    user_id: 'u09',
    content: 'I posted this but opted out of the globe. You should not see me on the map.',
    hoursAgo: 1,
    tags: ['Anxious'],
    location: LOC.california,
    contributeToGlobe: false,
  },
]

const GLOBE_REACTIONS: Array<{ id: string; vent_id: string; user_id: string; emoji: string }> = [
  { id: 'rg01', vent_id: 'vg01', user_id: 'u08', emoji: '🫂' },
  { id: 'rg02', vent_id: 'vg01', user_id: 'u09', emoji: '❤️' },
  { id: 'rg03', vent_id: 'vg08', user_id: 'u09', emoji: '😊' },
  { id: 'rg04', vent_id: 'vg09', user_id: 'u01', emoji: '🔥' },
  { id: 'rg05', vent_id: 'vg15', user_id: 'u06', emoji: '😤' },
  { id: 'rg06', vent_id: 'vg23', user_id: 'u02', emoji: '🫠' },
  { id: 'rg07', vent_id: 'vg28', user_id: 'u08', emoji: '😌' },
  { id: 'rg08', vent_id: 'vg33', user_id: 'u04', emoji: '📢' },
  { id: 'rg09', vent_id: 'vg38', user_id: 'u09', emoji: '💪' },
  { id: 'rg10', vent_id: 'vg43', user_id: 'u05', emoji: '🙏' },
  { id: 'rg11', vent_id: 'vg47', user_id: 'u01', emoji: '✨' },
  { id: 'rg12', vent_id: 'vg48', user_id: 'u03', emoji: '🌙' },
]

const GLOBE_COMMENTS: Array<{ id: string; vent_id: string; user_id: string; emoji: string }> = [
  { id: 'cg01', vent_id: 'vg01', user_id: 'u03', emoji: '🫂' },
  { id: 'cg02', vent_id: 'vg08', user_id: 'u04', emoji: '💛' },
  { id: 'cg03', vent_id: 'vg15', user_id: 'u07', emoji: '😅' },
  { id: 'cg04', vent_id: 'vg23', user_id: 'u09', emoji: '💙' },
  { id: 'cg05', vent_id: 'vg33', user_id: 'u05', emoji: '😤' },
  { id: 'cg06', vent_id: 'vg38', user_id: 'u01', emoji: '🚀' },
  { id: 'cg07', vent_id: 'vg47', user_id: 'u02', emoji: '🌍' },
]

function ventTimestamps(hoursAgo: number) {
  const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000)
  return {
    createdAt: createdAt.toISOString(),
    expiresAt: getWallExpiresAt(createdAt).toISOString(),
  }
}

async function seedGlobe() {
  // Tag ids from primary seed (t01…) or whatever is currently in DB by name
  const tagRows = await query<{ id: string; name: string }>('SELECT id, name FROM mood_tags')
  if (tagRows.rows.length === 0) {
    throw new Error('No mood tags found. Run `npm run db:seed` first.')
  }
  const tagByName = Object.fromEntries(tagRows.rows.map((t) => [t.name, t.id]))

  const userCheck = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM users WHERE id = ANY($1::text[])`,
    [['u01', 'u02', 'u03', 'u04', 'u05', 'u06', 'u07', 'u08', 'u09']]
  )
  if ((userCheck.rows[0]?.count ?? 0) < 9) {
    throw new Error('Demo users missing. Run `npm run db:seed` first.')
  }

  let ventsUpserted = 0
  let tagsLinked = 0
  let reactionsAdded = 0
  let commentsAdded = 0

  if (GLOBE_VENTS.length !== GLOBE_SLUGS.length) {
    throw new Error(
      `Globe seed mismatch: ${GLOBE_VENTS.length} vents vs ${GLOBE_SLUGS.length} slugs`
    )
  }

  for (let i = 0; i < GLOBE_VENTS.length; i++) {
    const vent = GLOBE_VENTS[i]
    const slug = GLOBE_SLUGS[i]
    const { createdAt, expiresAt } = ventTimestamps(vent.hoursAgo)
    const contribute = vent.contributeToGlobe !== false
    const loc = vent.location

    for (const name of vent.tags) {
      if (!tagByName[name]) {
        throw new Error(`Unknown mood tag "${name}" for vent ${vent.id}`)
      }
    }

    await query(
      `INSERT INTO vents (
         id, user_id, content, slug, created_at, expires_at,
         contribute_to_globe,
         location_country_code, location_country, location_state, location_city,
         location_lat, location_lng
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         $7,
         $8, $9, $10, $11,
         $12, $13
       )
       ON CONFLICT (id) DO UPDATE SET
         content = EXCLUDED.content,
         slug = EXCLUDED.slug,
         created_at = EXCLUDED.created_at,
         expires_at = EXCLUDED.expires_at,
         contribute_to_globe = EXCLUDED.contribute_to_globe,
         location_country_code = EXCLUDED.location_country_code,
         location_country = EXCLUDED.location_country,
         location_state = EXCLUDED.location_state,
         location_city = EXCLUDED.location_city,
         location_lat = EXCLUDED.location_lat,
         location_lng = EXCLUDED.location_lng`,
      [
        vent.id,
        vent.user_id,
        vent.content,
        slug,
        createdAt,
        expiresAt,
        contribute,
        loc.countryCode,
        loc.country,
        loc.state,
        loc.city,
        loc.lat,
        loc.lng,
      ]
    )
    ventsUpserted++

    await query('DELETE FROM vent_tags WHERE vent_id = $1', [vent.id])
    for (const tagName of vent.tags) {
      await query(
        `INSERT INTO vent_tags (vent_id, tag_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [vent.id, tagByName[tagName]]
      )
      tagsLinked++
    }
  }

  for (const reaction of GLOBE_REACTIONS) {
    const result = await query(
      `INSERT INTO reactions (id, vent_id, user_id, emoji)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (vent_id, user_id, emoji) DO NOTHING
       RETURNING id`,
      [reaction.id, reaction.vent_id, reaction.user_id, reaction.emoji]
    )
    if (result.rowCount) reactionsAdded++
  }

  for (const comment of GLOBE_COMMENTS) {
    const result = await query(
      `INSERT INTO vent_comments (id, vent_id, user_id, emoji)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [comment.id, comment.vent_id, comment.user_id, comment.emoji]
    )
    if (result.rowCount) commentsAdded++
  }

  const active = await query<{ region: string; n: number }>(
    `SELECT
       COALESCE(location_country_code, '?') || ':' || COALESCE(location_state, '_country') AS region,
       COUNT(*)::int AS n
     FROM vents
     WHERE id LIKE 'vg%'
       AND contribute_to_globe = true
       AND created_at > now() - interval '24 hours'
     GROUP BY 1
     ORDER BY 1`
  )

  console.log('Globe seed complete')
  console.log(`  Vents upserted: ${ventsUpserted}`)
  console.log(`  Tag links written: ${tagsLinked}`)
  console.log(`  Reactions added: ${reactionsAdded}`)
  console.log(`  Comments added: ${commentsAdded}`)
  console.log('  Active regions (last 24h, contribute=true):')
  for (const row of active.rows) {
    console.log(`    ${row.region} → ${row.n} vents`)
  }
  console.log('  Opt-out sample: vg51 (should not appear on globe)')
  console.log('Open the app → Vent Globe 🌍 to explore.')

  await pool.end()
}

seedGlobe().catch(async (err) => {
  console.error('Globe seed failed:', err)
  await pool.end().catch(() => {})
  process.exit(1)
})
