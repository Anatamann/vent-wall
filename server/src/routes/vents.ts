import { Router } from 'express'
import { z } from 'zod'
import { query } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { fetchVentsWithRelations } from '../utils/vents.js'
import { MAX_POSTS_PER_DAY, MAX_REACTIONS_PER_VENT } from '../constants.js'

const router = Router()

const createVentSchema = z.object({
  content: z.string().min(1).max(500),
  tag_ids: z.array(z.string().uuid()).min(1).max(3),
})

router.get('/', async (req, res) => {
  try {
    const tagIds = typeof req.query.tags === 'string'
      ? req.query.tags.split(',').filter(Boolean)
      : []

    const vents = await fetchVentsWithRelations({
      tagIds,
      sortBy: String(req.query.sort || 'newest'),
      timeFilter: String(req.query.time || 'all'),
      offset: Number(req.query.offset || 0),
      limit: Math.min(Number(req.query.limit || 20), 50),
    })

    return res.json(vents)
  } catch (err) {
    console.error('Fetch vents error:', err)
    return res.status(500).json({ error: 'Failed to fetch vents' })
  }
})

router.post('/', requireAuth, async (req, res) => {
  const parsed = createVentSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  const { content, tag_ids } = parsed.data
  const userId = req.user!.userId

  const { pool } = await import('../db.js')
  const pgClient = await pool.connect()

  try {
    await pgClient.query('BEGIN')

    const userResult = await pgClient.query(
      'SELECT post_count_today, last_post_date FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    )
    const user = userResult.rows[0]
    if (!user) {
      await pgClient.query('ROLLBACK')
      return res.status(404).json({ error: 'User not found' })
    }

    const today = new Date().toISOString().split('T')[0]
    const postsToday = user.last_post_date === today ? user.post_count_today : 0

    if (postsToday >= MAX_POSTS_PER_DAY) {
      await pgClient.query('ROLLBACK')
      return res.status(429).json({
        error: `You can only post ${MAX_POSTS_PER_DAY} vents per day. Try again tomorrow!`,
      })
    }

    const ventResult = await pgClient.query(
      `INSERT INTO vents (user_id, content)
       VALUES ($1, $2)
       RETURNING id, user_id, content, created_at, expires_at`,
      [userId, content.trim()]
    )
    const vent = ventResult.rows[0]

    for (const tagId of tag_ids) {
      await pgClient.query(
        'INSERT INTO vent_tags (vent_id, tag_id) VALUES ($1, $2)',
        [vent.id, tagId]
      )
    }

    const newPostCount = postsToday + 1
    await pgClient.query(
      'UPDATE users SET post_count_today = $1, last_post_date = $2 WHERE id = $3',
      [newPostCount, today, userId]
    )

    await pgClient.query('COMMIT')

    const vents = await fetchVentsWithRelations({ offset: 0, limit: 50 })
    const created = vents.find((v) => v.id === vent.id)

    return res.status(201).json(created || vent)
  } catch (err) {
    await pgClient.query('ROLLBACK')
    console.error('Create vent error:', err)
    return res.status(500).json({ error: 'Failed to create vent' })
  } finally {
    pgClient.release()
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM vents WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user!.userId]
    )

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Vent not found' })
    }

    return res.status(204).send()
  } catch (err) {
    console.error('Delete vent error:', err)
    return res.status(500).json({ error: 'Failed to delete vent' })
  }
})

router.post('/:id/reactions', requireAuth, async (req, res) => {
  const emoji = String(req.body.emoji || '').trim()
  if (!emoji) {
    return res.status(400).json({ error: 'Emoji is required' })
  }

  const ventId = req.params.id
  const userId = req.user!.userId

  try {
    const existing = await query(
      'SELECT id FROM reactions WHERE vent_id = $1 AND user_id = $2 AND emoji = $3',
      [ventId, userId, emoji]
    )

    if (existing.rowCount) {
      await query('DELETE FROM reactions WHERE id = $1', [existing.rows[0].id])
      return res.json({ action: 'removed' })
    }

    const countResult = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM reactions
       WHERE vent_id = $1 AND user_id = $2`,
      [ventId, userId]
    )

    if ((countResult.rows[0]?.count ?? 0) >= MAX_REACTIONS_PER_VENT) {
      return res.status(429).json({
        error: `You can only add up to ${MAX_REACTIONS_PER_VENT} reactions per vent`,
      })
    }

    const inserted = await query(
      `INSERT INTO reactions (vent_id, user_id, emoji)
       VALUES ($1, $2, $3)
       RETURNING id, vent_id, user_id, emoji, created_at`,
      [ventId, userId, emoji]
    )

    return res.status(201).json({ action: 'added', reaction: inserted.rows[0] })
  } catch (err) {
    console.error('Reaction error:', err)
    return res.status(500).json({ error: 'Failed to update reaction' })
  }
})

export default router