import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import { pool, query } from '../db.js'

dotenv.config()

const DEMO_PASSWORD = 'demo123'

const USERS = [
  { id: '11111111-1111-1111-1111-111111111101', username: 'mindful_soul', email: 'mindful@ventwall.local' },
  { id: '11111111-1111-1111-1111-111111111102', username: 'night_thinker', email: 'night@ventwall.local' },
  { id: '11111111-1111-1111-1111-111111111103', username: 'coffee_dreamer', email: 'coffee@ventwall.local' },
  { id: '11111111-1111-1111-1111-111111111104', username: 'ocean_waves', email: 'ocean@ventwall.local' },
  { id: '11111111-1111-1111-1111-111111111105', username: 'city_wanderer', email: 'city@ventwall.local' },
  { id: '11111111-1111-1111-1111-111111111106', username: 'quiet_storm', email: 'quiet@ventwall.local' },
  { id: '11111111-1111-1111-1111-111111111107', username: 'sunrise_seeker', email: 'sunrise@ventwall.local' },
  { id: '11111111-1111-1111-1111-111111111108', username: 'midnight_poet', email: 'poet@ventwall.local' },
  { id: '11111111-1111-1111-1111-111111111109', username: 'demo', email: 'demo@ventwall.local' },
]

const MOOD_TAGS = [
  { id: '22222222-2222-2222-2222-222222222201', name: 'Happy', color: '#fbbf24', emoji: '😊' },
  { id: '22222222-2222-2222-2222-222222222202', name: 'Excited', color: '#f59e0b', emoji: '🤩' },
  { id: '22222222-2222-2222-2222-222222222203', name: 'Calm', color: '#10b981', emoji: '😌' },
  { id: '22222222-2222-2222-2222-222222222204', name: 'Grateful', color: '#ec4899', emoji: '🙏' },
  { id: '22222222-2222-2222-2222-222222222205', name: 'Motivated', color: '#0ea5e9', emoji: '💪' },
  { id: '22222222-2222-2222-2222-222222222206', name: 'Hopeful', color: '#8b5cf6', emoji: '🌟' },
  { id: '22222222-2222-2222-2222-222222222207', name: 'Peaceful', color: '#06b6d4', emoji: '🕊️' },
  { id: '22222222-2222-2222-2222-222222222208', name: 'Sad', color: '#3b82f6', emoji: '😢' },
  { id: '22222222-2222-2222-2222-222222222209', name: 'Anxious', color: '#8b5cf6', emoji: '😰' },
  { id: '22222222-2222-2222-2222-222222222210', name: 'Frustrated', color: '#f97316', emoji: '😤' },
  { id: '22222222-2222-2222-2222-222222222211', name: 'Lonely', color: '#6366f1', emoji: '😔' },
  { id: '22222222-2222-2222-2222-222222222212', name: 'Overwhelmed', color: '#a855f7', emoji: '😵' },
  { id: '22222222-2222-2222-2222-222222222213', name: 'Angry', color: '#ef4444', emoji: '😡' },
  { id: '22222222-2222-2222-2222-222222222214', name: 'Confused', color: '#64748b', emoji: '🤔' },
  { id: '22222222-2222-2222-2222-222222222215', name: 'Nostalgic', color: '#f472b6', emoji: '🌅' },
]

const VENTS = [
  {
    id: '33333333-3333-3333-3333-333333333301',
    user_id: USERS[0].id,
    content: 'Morning meditation helped me find a moment of peace before the chaos of the day begins.',
    daysAgo: 1,
    tags: ['Calm', 'Grateful', 'Peaceful'],
  },
  {
    id: '33333333-3333-3333-3333-333333333302',
    user_id: USERS[1].id,
    content: 'Another sleepless night. My mind just will not stop racing through every possible scenario.',
    daysAgo: 0,
    tags: ['Anxious', 'Overwhelmed'],
  },
  {
    id: '33333333-3333-3333-3333-333333333303',
    user_id: USERS[2].id,
    content: 'Grateful for this quiet morning coffee and the sunrise painting the sky orange.',
    daysAgo: 0,
    tags: ['Grateful', 'Happy', 'Hopeful'],
  },
  {
    id: '33333333-3333-3333-3333-333333333304',
    user_id: USERS[3].id,
    content: 'The ocean always knows how to wash away the heaviness. Walked the beach until I felt lighter.',
    daysAgo: 2,
    tags: ['Calm', 'Peaceful', 'Nostalgic'],
  },
  {
    id: '33333333-3333-3333-3333-333333333305',
    user_id: USERS[4].id,
    content: 'City energy is exhausting today. Too many people, too much noise, not enough air.',
    daysAgo: 1,
    tags: ['Frustrated', 'Overwhelmed'],
  },
  {
    id: '33333333-3333-3333-3333-333333333306',
    user_id: USERS[5].id,
    content: 'Growth is uncomfortable. Learning to sit with difficult feelings instead of running from them.',
    daysAgo: 3,
    tags: ['Hopeful', 'Motivated', 'Confused'],
  },
  {
    id: '33333333-3333-3333-3333-333333333307',
    user_id: USERS[6].id,
    content: 'New day, new chances. Trying to believe that things can get better even when yesterday was hard.',
    daysAgo: 0,
    tags: ['Hopeful', 'Motivated'],
  },
  {
    id: '33333333-3333-3333-3333-333333333308',
    user_id: USERS[7].id,
    content: 'Wrote three pages of feelings I could not say out loud. Poetry is my safest room.',
    daysAgo: 1,
    tags: ['Sad', 'Nostalgic', 'Calm'],
  },
  {
    id: '33333333-3333-3333-3333-333333333309',
    user_id: USERS[0].id,
    content: 'Small wins matter. Finished a task I had been avoiding for weeks and feel surprisingly proud.',
    daysAgo: 4,
    tags: ['Motivated', 'Happy'],
  },
  {
    id: '33333333-3333-3333-3333-333333333310',
    user_id: USERS[1].id,
    content: 'Feeling lonely in a crowded room again. Wish connection felt easier sometimes.',
    daysAgo: 2,
    tags: ['Lonely', 'Sad'],
  },
]

async function seed() {
  const existing = await query('SELECT COUNT(*)::int AS count FROM users')
  if (existing.rows[0].count > 0) {
    console.log('Database already seeded — skipping')
    await pool.end()
    return
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)

  for (const user of USERS) {
    await query(
      `INSERT INTO users (id, username, email, password_hash, last_post_date, post_count_today)
       VALUES ($1, $2, $3, $4, CURRENT_DATE, 0)`,
      [user.id, user.username, user.email, passwordHash]
    )
  }

  for (const tag of MOOD_TAGS) {
    await query(
      `INSERT INTO mood_tags (id, name, color, emoji) VALUES ($1, $2, $3, $4)`,
      [tag.id, tag.name, tag.color, tag.emoji]
    )
  }

  const tagByName = Object.fromEntries(MOOD_TAGS.map((t) => [t.name, t.id]))

  for (const vent of VENTS) {
    const createdAt = new Date()
    createdAt.setDate(createdAt.getDate() - vent.daysAgo)

    const createdAtIso = createdAt.toISOString()
    const expiresAt = new Date(createdAt)
    expiresAt.setMonth(expiresAt.getMonth() + 1)

    await query(
      `INSERT INTO vents (id, user_id, content, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [vent.id, vent.user_id, vent.content, createdAtIso, expiresAt.toISOString()]
    )

    for (const tagName of vent.tags) {
      await query(
        'INSERT INTO vent_tags (vent_id, tag_id) VALUES ($1, $2)',
        [vent.id, tagByName[tagName]]
      )
    }
  }

  const reactions = [
    { vent_id: VENTS[0].id, user_id: USERS[2].id, emoji: '🙏' },
    { vent_id: VENTS[0].id, user_id: USERS[3].id, emoji: '😌' },
    { vent_id: VENTS[1].id, user_id: USERS[0].id, emoji: '🫂' },
    { vent_id: VENTS[1].id, user_id: USERS[6].id, emoji: '❤️' },
    { vent_id: VENTS[2].id, user_id: USERS[4].id, emoji: '☕' },
    { vent_id: VENTS[2].id, user_id: USERS[7].id, emoji: '🌅' },
    { vent_id: VENTS[3].id, user_id: USERS[1].id, emoji: '🌊' },
    { vent_id: VENTS[4].id, user_id: USERS[5].id, emoji: '🤗' },
    { vent_id: VENTS[5].id, user_id: USERS[6].id, emoji: '💪' },
    { vent_id: VENTS[6].id, user_id: USERS[2].id, emoji: '🌟' },
    { vent_id: VENTS[7].id, user_id: USERS[0].id, emoji: '✨' },
    { vent_id: VENTS[7].id, user_id: USERS[3].id, emoji: '📝' },
  ]

  for (const reaction of reactions) {
    await query(
      'INSERT INTO reactions (vent_id, user_id, emoji) VALUES ($1, $2, $3)',
      [reaction.vent_id, reaction.user_id, reaction.emoji]
    )
  }

  console.log('Seed complete')
  console.log(`Demo accounts: any seeded username / password "${DEMO_PASSWORD}"`)
  console.log('Quick login: demo / demo123')
  await pool.end()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})