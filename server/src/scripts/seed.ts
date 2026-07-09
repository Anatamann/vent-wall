import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import { pool, query } from '../db.js'
import { backfillMissingVentSlugs } from '../utils/slug.js'
import { getWallExpiresAt } from '../utils/wall.js'

dotenv.config()

const DEMO_PASSWORD = 'demo123'

const USERS = [
  { id: 'u01', username: 'mindful_soul', email: 'mindful@ventwall.local' },
  { id: 'u02', username: 'night_thinker', email: 'night@ventwall.local' },
  { id: 'u03', username: 'coffee_dreamer', email: 'coffee@ventwall.local' },
  { id: 'u04', username: 'ocean_waves', email: 'ocean@ventwall.local' },
  { id: 'u05', username: 'city_wanderer', email: 'city@ventwall.local' },
  { id: 'u06', username: 'quiet_storm', email: 'quiet@ventwall.local' },
  { id: 'u07', username: 'sunrise_seeker', email: 'sunrise@ventwall.local' },
  { id: 'u08', username: 'midnight_poet', email: 'poet@ventwall.local' },
  { id: 'u09', username: 'demo', email: 'demo@ventwall.local' },
]

const MOOD_TAGS = [
  { id: 't01', name: 'Happy', color: '#fbbf24', emoji: '😊' },
  { id: 't02', name: 'Excited', color: '#f59e0b', emoji: '🤩' },
  { id: 't03', name: 'Calm', color: '#10b981', emoji: '😌' },
  { id: 't04', name: 'Grateful', color: '#ec4899', emoji: '🙏' },
  { id: 't05', name: 'Motivated', color: '#0ea5e9', emoji: '💪' },
  { id: 't06', name: 'Hopeful', color: '#8b5cf6', emoji: '🌟' },
  { id: 't07', name: 'Peaceful', color: '#06b6d4', emoji: '🕊️' },
  { id: 't08', name: 'Sad', color: '#3b82f6', emoji: '😢' },
  { id: 't09', name: 'Anxious', color: '#8b5cf6', emoji: '😰' },
  { id: 't10', name: 'Frustrated', color: '#f97316', emoji: '😤' },
  { id: 't11', name: 'Lonely', color: '#6366f1', emoji: '😔' },
  { id: 't12', name: 'Overwhelmed', color: '#a855f7', emoji: '😵' },
  { id: 't13', name: 'Angry', color: '#ef4444', emoji: '😡' },
  { id: 't14', name: 'Confused', color: '#64748b', emoji: '🤔' },
  { id: 't15', name: 'Nostalgic', color: '#f472b6', emoji: '🌅' },
  { id: 't16', name: 'Dreaming', color: '#7C3AED', emoji: '💭' },
  { id: 't17', name: 'Fantasy', color: '#A855F7', emoji: '🧚' },
  { id: 't18', name: 'Work Rant', color: '#DC2626', emoji: '📢' },
  { id: 't19', name: 'Witty', color: '#EAB308', emoji: '😏' },
  { id: 't20', name: 'Horny', color: '#BE123C', emoji: '🔥' },
  { id: 't21', name: 'Flirty', color: '#EC4899', emoji: '😉' },
  { id: 't22', name: 'Burnout', color: '#78716F', emoji: '🫠' },
  { id: 't23', name: 'Petty', color: '#F97316', emoji: '🙄' },
  { id: 't24', name: 'Savage', color: '#DB2777', emoji: '💅' },
  { id: 't25', name: 'Overthinking', color: '#4F46E5', emoji: '🌀' },
  { id: 't26', name: 'Gossip', color: '#D946EF', emoji: '👀' },
  { id: 't27', name: 'Unhinged', color: '#65A30D', emoji: '🎭' },
  { id: 't28', name: 'Spicy', color: '#991B1B', emoji: '🌶️' },
  { id: 't29', name: 'Daydreaming', color: '#0EA5E9', emoji: '☁️' },
  { id: 't30', name: 'Ambitious', color: '#059669', emoji: '🚀' },
  { id: 't31', name: 'Sarcastic', color: '#CA8A04', emoji: '🙃' },
  { id: 't32', name: 'Caffeinated', color: '#78350F', emoji: '☕' },
  { id: 't33', name: 'Existential', color: '#4338CA', emoji: '🌌' },
  { id: 't34', name: 'Villain Arc', color: '#7F1D1D', emoji: '😈' },
  { id: 't35', name: 'Delulu', color: '#C026D3', emoji: '🦄' },
  { id: 't36', name: 'Touch Starved', color: '#FB7185', emoji: '🫂' },
  { id: 't37', name: 'Chaos Mode', color: '#84CC16', emoji: '🌪️' },
  { id: 't38', name: 'Shower Thoughts', color: '#06B6D4', emoji: '🚿' },
  { id: 't39', name: 'Dead Inside', color: '#52525B', emoji: '💀' },
  { id: 't40', name: 'Main Character', color: '#FACC15', emoji: '✨' },
  { id: 't41', name: 'Thirsty', color: '#E11D48', emoji: '💦' },
  { id: 't42', name: 'Seductive', color: '#9D174D', emoji: '💋' },
  { id: 't43', name: 'Steamy', color: '#9F1239', emoji: '♨️' },
  { id: 't44', name: 'Sensual', color: '#831843', emoji: '🕯️' },
  { id: 't45', name: 'Heated', color: '#C2410C', emoji: '🥵' },
  { id: 't46', name: 'After Dark', color: '#4C1D95', emoji: '🌙' },
  { id: 't47', name: 'Secret Desire', color: '#7E22CE', emoji: '🤫' },
  { id: 't48', name: 'Teasing', color: '#F43F5E', emoji: '🫦' },
  { id: 't49', name: 'Erotic Fantasy', color: '#BE185D', emoji: '🌹' },
  { id: 't50', name: 'Kink Curious', color: '#581C87', emoji: '⛓️' },
  { id: 't51', name: 'Naughty', color: '#D63384', emoji: '💄' },
  { id: 't52', name: 'Yearning', color: '#F472B6', emoji: '🫀' },
]

const VENTS = [
  {
    id: 'v01',
    slug: 'peace2am',
    user_id: USERS[0].id,
    content:
      'Morning meditation helped me find a moment of peace before the chaos of the day begins.',
    hoursAgo: 18,
    tags: ['Calm', 'Grateful', 'Peaceful'],
  },
  {
    id: 'v02',
    slug: 'nyte2amx',
    user_id: USERS[1].id,
    content:
      'Another sleepless night. My mind just will not stop racing through every possible scenario.',
    hoursAgo: 2,
    tags: ['Anxious', 'Overwhelmed'],
  },
  {
    id: 'v03',
    slug: 'caff33am',
    user_id: USERS[2].id,
    content: 'Grateful for this quiet morning coffee and the sunrise painting the sky orange.',
    hoursAgo: 4,
    tags: ['Grateful', 'Happy', 'Hopeful'],
  },
  {
    id: 'v04',
    slug: 'wave5hmt',
    user_id: USERS[3].id,
    content:
      'The ocean always knows how to wash away the heaviness. Walked the beach until I felt lighter.',
    hoursAgo: 50,
    tags: ['Calm', 'Peaceful', 'Nostalgic'],
  },
  {
    id: 'v05',
    slug: 'ctywr3nt',
    user_id: USERS[4].id,
    content: 'City energy is exhausting today. Too many people, too much noise, not enough air.',
    hoursAgo: 20,
    tags: ['Frustrated', 'Overwhelmed'],
  },
  {
    id: 'v06',
    slug: 'grw7thmx',
    user_id: USERS[5].id,
    content:
      'Growth is uncomfortable. Learning to sit with difficult feelings instead of running from them.',
    hoursAgo: 80,
    tags: ['Hopeful', 'Motivated', 'Confused'],
  },
  {
    id: 'v07',
    slug: 'newd4awn',
    user_id: USERS[6].id,
    content:
      'New day, new chances. Trying to believe that things can get better even when yesterday was hard.',
    hoursAgo: 1,
    tags: ['Hopeful', 'Motivated'],
  },
  {
    id: 'v08',
    slug: 'p3tmn3xw',
    user_id: USERS[7].id,
    content: 'Wrote three pages of feelings I could not say out loud. Poetry is my safest room.',
    hoursAgo: 15,
    tags: ['Sad', 'Nostalgic', 'Calm'],
  },
  {
    id: 'v09',
    slug: 'smawdn2x',
    user_id: USERS[0].id,
    content:
      'Small wins matter. Finished a task I had been avoiding for weeks and feel surprisingly proud.',
    hoursAgo: 100,
    tags: ['Motivated', 'Happy'],
  },
  {
    id: 'v10',
    slug: 'n3yerm2x',
    user_id: USERS[1].id,
    content: 'Feeling lonely in a crowded room again. Wish connection felt easier sometimes.',
    hoursAgo: 48,
    tags: ['Lonely', 'Sad'],
  },
  {
    id: 'v11',
    slug: 'tdysght2',
    user_id: USERS[2].id,
    content: 'Today felt lighter.',
    hoursAgo: 6,
    tags: ['Happy', 'Calm'],
  },
  {
    id: 'v12',
    slug: 'repray2n',
    user_id: USERS[1].id,
    content:
      'I keep replaying conversations from years ago like they are happening right now. Why does the mind do this at 2am? I know logically that everyone has moved on, but emotionally I am still standing in that hallway wondering what I should have said differently.',
    hoursAgo: 8,
    tags: ['Anxious', 'Nostalgic', 'Sad'],
  },
  {
    id: 'v13',
    slug: 'satarx2m',
    user_id: USERS[3].id,
    content:
      'Salt air, cold sand, and the sound of waves until my thoughts finally went quiet. Nature therapy is real.',
    hoursAgo: 10,
    tags: ['Peaceful', 'Calm', 'Grateful'],
  },
  {
    id: 'v14',
    slug: 'msstrn2x',
    user_id: USERS[4].id,
    content: 'Missed my train. Late to everything. Urban life is a constant sprint.',
    hoursAgo: 3,
    tags: ['Frustrated', 'Anxious'],
  },
  {
    id: 'v15',
    slug: 'therapyh',
    user_id: USERS[5].id,
    content:
      'Therapy homework: name the feeling without judging it. Today I named it grief, and that alone made it softer.',
    hoursAgo: 22,
    tags: ['Sad', 'Hopeful', 'Calm'],
  },
  {
    id: 'v16',
    slug: 'frstrun2',
    user_id: USERS[6].id,
    content: 'First run in months. Legs burned, heart raced, but I feel alive again.',
    hoursAgo: 5,
    tags: ['Motivated', 'Excited', 'Happy'],
  },
  {
    id: 'v17',
    slug: 'p3mstn2w',
    user_id: USERS[7].id,
    content:
      'Some poems are just screams in prettier fonts. Wrote one tonight and deleted it twice before keeping a single stanza.',
    hoursAgo: 12,
    tags: ['Sad', 'Confused', 'Nostalgic'],
  },
  {
    id: 'v18',
    slug: 'br3ath2e',
    user_id: USERS[0].id,
    content: 'Breathed in. Breathed out. That is enough for today.',
    hoursAgo: 7,
    tags: ['Calm', 'Peaceful'],
  },
  {
    id: 'v19',
    slug: 'dempst2x',
    user_id: USERS[8].id,
    content:
      'Testing Vent Wall with the demo account. Grateful this exists as a place to share without pressure.',
    hoursAgo: 2,
    tags: ['Grateful', 'Hopeful'],
  },
  {
    id: 'v20',
    slug: 'surfwave',
    user_id: USERS[3].id,
    content:
      'Surfed until my arms gave out. For an hour the only thing that mattered was the next wave.',
    hoursAgo: 72,
    tags: ['Excited', 'Happy', 'Peaceful'],
  },
]

const REACTIONS = [
  { vent_id: VENTS[0].id, user_id: USERS[2].id, emoji: '🙏' },
  { vent_id: VENTS[0].id, user_id: USERS[3].id, emoji: '😌' },
  { vent_id: VENTS[0].id, user_id: USERS[6].id, emoji: '❤️' },
  { vent_id: VENTS[1].id, user_id: USERS[0].id, emoji: '🫂' },
  { vent_id: VENTS[1].id, user_id: USERS[6].id, emoji: '❤️' },
  { vent_id: VENTS[1].id, user_id: USERS[4].id, emoji: '🙏' },
  { vent_id: VENTS[1].id, user_id: USERS[7].id, emoji: '🌙' },
  { vent_id: VENTS[2].id, user_id: USERS[4].id, emoji: '☕' },
  { vent_id: VENTS[2].id, user_id: USERS[7].id, emoji: '🌅' },
  { vent_id: VENTS[2].id, user_id: USERS[0].id, emoji: '😊' },
  { vent_id: VENTS[2].id, user_id: USERS[5].id, emoji: '✨' },
  { vent_id: VENTS[3].id, user_id: USERS[1].id, emoji: '🌊' },
  { vent_id: VENTS[3].id, user_id: USERS[2].id, emoji: '🏄' },
  { vent_id: VENTS[4].id, user_id: USERS[5].id, emoji: '🤗' },
  { vent_id: VENTS[4].id, user_id: USERS[3].id, emoji: '🌃' },
  { vent_id: VENTS[5].id, user_id: USERS[6].id, emoji: '💪' },
  { vent_id: VENTS[5].id, user_id: USERS[0].id, emoji: '🌈' },
  { vent_id: VENTS[6].id, user_id: USERS[2].id, emoji: '🌟' },
  { vent_id: VENTS[6].id, user_id: USERS[1].id, emoji: '🔥' },
  { vent_id: VENTS[6].id, user_id: USERS[4].id, emoji: '💪' },
  { vent_id: VENTS[7].id, user_id: USERS[0].id, emoji: '✨' },
  { vent_id: VENTS[7].id, user_id: USERS[3].id, emoji: '📝' },
  { vent_id: VENTS[8].id, user_id: USERS[2].id, emoji: '👏' },
  { vent_id: VENTS[9].id, user_id: USERS[5].id, emoji: '🫂' },
  { vent_id: VENTS[9].id, user_id: USERS[6].id, emoji: '❤️' },
  { vent_id: VENTS[10].id, user_id: USERS[3].id, emoji: '😊' },
  { vent_id: VENTS[11].id, user_id: USERS[0].id, emoji: '🫂' },
  { vent_id: VENTS[11].id, user_id: USERS[2].id, emoji: '🙏' },
  { vent_id: VENTS[12].id, user_id: USERS[1].id, emoji: '🌊' },
  { vent_id: VENTS[13].id, user_id: USERS[5].id, emoji: '🤗' },
  { vent_id: VENTS[15].id, user_id: USERS[4].id, emoji: '🔥' },
  { vent_id: VENTS[15].id, user_id: USERS[7].id, emoji: '💪' },
  { vent_id: VENTS[17].id, user_id: USERS[6].id, emoji: '🕊️' },
  { vent_id: VENTS[18].id, user_id: USERS[0].id, emoji: '👏' },
  { vent_id: VENTS[18].id, user_id: USERS[2].id, emoji: '❤️' },
]

const COMMENTS = [
  { id: 'c01', vent_id: VENTS[1].id, user_id: USERS[2].id, emoji: '🫂' },
  { id: 'c02', vent_id: VENTS[1].id, user_id: USERS[5].id, emoji: '💙' },
  { id: 'c03', vent_id: VENTS[2].id, user_id: USERS[0].id, emoji: '☕' },
  { id: 'c04', vent_id: VENTS[2].id, user_id: USERS[4].id, emoji: '🌅' },
  { id: 'c05', vent_id: VENTS[6].id, user_id: USERS[1].id, emoji: '🌟' },
  { id: 'c06', vent_id: VENTS[6].id, user_id: USERS[3].id, emoji: '💪' },
  { id: 'c07', vent_id: VENTS[6].id, user_id: USERS[7].id, emoji: '✨' },
  { id: 'c08', vent_id: VENTS[11].id, user_id: USERS[4].id, emoji: '🫂' },
  { id: 'c09', vent_id: VENTS[13].id, user_id: USERS[2].id, emoji: '🤗' },
  { id: 'c10', vent_id: VENTS[15].id, user_id: USERS[0].id, emoji: '🔥' },
  { id: 'c11', vent_id: VENTS[18].id, user_id: USERS[3].id, emoji: '👏' },
  { id: 'c12', vent_id: VENTS[18].id, user_id: USERS[6].id, emoji: '❤️' },
]

function ventTimestamps(hoursAgo: number) {
  const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000)
  return {
    createdAt: createdAt.toISOString(),
    expiresAt: getWallExpiresAt(createdAt).toISOString(),
  }
}

async function seed() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)
  const tagByName = Object.fromEntries(MOOD_TAGS.map((t) => [t.name, t.id]))

  let usersAdded = 0
  let ventsSynced = 0
  let reactionsAdded = 0
  let commentsAdded = 0

  for (const user of USERS) {
    const result = await query(
      `INSERT INTO users (id, username, email, password_hash, last_post_date, post_count_today)
       VALUES ($1, $2, $3, $4, CURRENT_DATE, 0)
       ON CONFLICT (id) DO UPDATE
         SET username = EXCLUDED.username,
             email = EXCLUDED.email
       RETURNING (xmax = 0) AS inserted`,
      [user.id, user.username, user.email, passwordHash]
    )
    if (result.rows[0]?.inserted) usersAdded++
  }

  for (const tag of MOOD_TAGS) {
    await query(
      `INSERT INTO mood_tags (id, name, color, emoji)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [tag.id, tag.name, tag.color, tag.emoji]
    )
  }

  for (const vent of VENTS) {
    const { createdAt, expiresAt } = ventTimestamps(vent.hoursAgo)

    await query(
      `INSERT INTO vents (id, user_id, content, slug, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE
         SET content = EXCLUDED.content,
             slug = EXCLUDED.slug,
             created_at = EXCLUDED.created_at,
             expires_at = EXCLUDED.expires_at`,
      [vent.id, vent.user_id, vent.content, vent.slug, createdAt, expiresAt]
    )
    ventsSynced++

    await query('DELETE FROM vent_tags WHERE vent_id = $1', [vent.id])
    for (const tagName of vent.tags) {
      await query(
        `INSERT INTO vent_tags (vent_id, tag_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [vent.id, tagByName[tagName]]
      )
    }
  }

  let reactionIndex = 0
  for (const reaction of REACTIONS) {
    reactionIndex++
    const reactionId = `r${String(reactionIndex).padStart(2, '0')}`
    const result = await query(
      `INSERT INTO reactions (id, vent_id, user_id, emoji)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (vent_id, user_id, emoji) DO NOTHING
       RETURNING id`,
      [reactionId, reaction.vent_id, reaction.user_id, reaction.emoji]
    )
    if (result.rowCount) reactionsAdded++
  }

  for (const comment of COMMENTS) {
    const result = await query(
      `INSERT INTO vent_comments (id, vent_id, user_id, emoji)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [comment.id, comment.vent_id, comment.user_id, comment.emoji]
    )
    if (result.rowCount) commentsAdded++
  }

  const slugsBackfilled = await backfillMissingVentSlugs()

  console.log('Seed sync complete')
  console.log(`  Users added: ${usersAdded}`)
  console.log(`  Demo vents synced: ${ventsSynced}`)
  console.log(`  Reactions added: ${reactionsAdded}`)
  console.log(`  Comments added: ${commentsAdded}`)
  console.log(`  Slugs backfilled: ${slugsBackfilled}`)
  console.log(`Demo accounts: any seeded username / password "${DEMO_PASSWORD}"`)
  console.log('Quick login: demo / demo123')
  await pool.end()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})