import { Router } from 'express'
import { z } from 'zod'
import { query } from '../db.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { generateUniqueVentSlug, resolveVentId } from '../utils/slug.js'
import { fetchVentsWithRelations, fetchVentById, fetchVentByIdentifier } from '../utils/vents.js'
import {
  fetchCommentsForVent,
  mapCommentRow,
  parseCommentInput,
  validateEmojiComment,
  validateGifComment,
  ventAcceptsComments,
} from '../utils/comments.js'
import { createPublicId } from '../utils/ids.js'
import { isPublicId, parsePublicIdList } from '../utils/validation.js'
import { ingestKlipyGif } from '../utils/media-assets.js'
import { isKlipyConfigured } from '../providers/klipy.js'
import { isOnWall } from '../utils/wall.js'
import {
  MAX_COMMENTS_PER_USER_PER_VENT,
  MAX_OP_COMMENTS_PER_VENT,
  MAX_COMMENTS_PER_VENT,
  MAX_GIF_COMMENTS_PER_USER_PER_HOUR,
  MAX_POSTS_PER_DAY,
  MAX_REACTIONS_PER_VENT,
  MAX_VENT_EDITS,
} from '../constants.js'
import { resolveLocationFromRequest } from '../utils/geolocation.js'

const router = Router()

async function resolveVentIdOr404(
  identifier: string,
  res: import('express').Response
): Promise<string | null> {
  const ventId = await resolveVentId(identifier)
  if (!ventId) {
    res.status(404).json({ error: 'Vent not found' })
    return null
  }
  return ventId
}

const createVentSchema = z
  .object({
    content: z.string().max(500).optional().default(''),
    gif_id: z.string().trim().optional(),
    tag_ids: z
      .array(z.string().refine(isPublicId, { message: 'Invalid tag id' }))
      .min(1)
      .max(3),
    /** Opt-in for Vent Globe visibility. Default true. Raw IP is never stored. */
    contribute_to_globe: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    const hasText = data.content.trim().length > 0
    const hasGif = Boolean(data.gif_id?.trim())
    if (!hasText && !hasGif) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Add text, a GIF, or both',
      })
    }
  })

/** OP may edit content/tags while the vent is still on the Wall. */
const updateVentSchema = z
  .object({
    content: z.string().max(500).optional().default(''),
    gif_id: z.string().trim().optional(),
    remove_gif: z.boolean().optional().default(false),
    tag_ids: z
      .array(z.string().refine(isPublicId, { message: 'Invalid tag id' }))
      .min(1)
      .max(3),
    contribute_to_globe: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // Final GIF presence is validated against existing vent in the handler.
    if (data.remove_gif && data.gif_id?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cannot set and remove a GIF in the same request',
      })
    }
  })

router.get('/', async (req, res) => {
  try {
    const rawTags = typeof req.query.tags === 'string' ? req.query.tags : ''
    const tagIds = parsePublicIdList(rawTags)
    if (tagIds === null) {
      return res.status(400).json({ error: 'Invalid tag filter' })
    }

    const vents = await fetchVentsWithRelations({
      tagIds,
      sortBy: String(req.query.sort || 'newest'),
      timeFilter: String(req.query.time || 'all'),
      offset: Math.max(0, Number(req.query.offset || 0)),
      limit: Math.min(Math.max(1, Number(req.query.limit || 20)), 50),
    })

    return res.json(vents)
  } catch (err) {
    console.error('Fetch vents error:', err)
    return res.status(500).json({ error: 'Failed to fetch vents' })
  }
})

router.get('/:id/comments', optionalAuth, async (req, res) => {
  try {
    const vent = await fetchVentByIdentifier(req.params.id)
    if (!vent) {
      return res.status(404).json({ error: 'Vent not found' })
    }

    const viewerId = req.user?.userId
    const isOwner = viewerId === vent.user_id

    if (!vent.is_on_wall && !isOwner) {
      return res.status(404).json({ error: 'Vent not found' })
    }

    const comments = vent.is_on_wall ? await fetchCommentsForVent(vent.id) : []

    return res.json({
      comments: comments.map(mapCommentRow),
      comments_open: vent.is_on_wall,
    })
  } catch (err) {
    console.error('Fetch comments error:', err)
    return res.status(500).json({ error: 'Failed to fetch comments' })
  }
})

router.post('/:id/comments', requireAuth, async (req, res) => {
  const parsed = parseCommentInput(req.body)
  if (!parsed) {
    return res.status(400).json({ error: 'Invalid comment payload' })
  }

  const userId = req.user!.userId

  try {
    const ventId = await resolveVentIdOr404(req.params.id, res)
    if (!ventId) return

    const ventCheck = await ventAcceptsComments(ventId)
    if (!ventCheck.accepts || !ventCheck.expires_at) {
      return res.status(403).json({
        error: 'Comments are only available while this post is on the Wall',
      })
    }

    const isOwner = ventCheck.user_id === userId
    const userCommentLimit = isOwner
      ? MAX_OP_COMMENTS_PER_VENT
      : MAX_COMMENTS_PER_USER_PER_VENT

    const countResult = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM vent_comments
       WHERE vent_id = $1 AND user_id = $2`,
      [ventId, userId]
    )

    if ((countResult.rows[0]?.count ?? 0) >= userCommentLimit) {
      return res.status(429).json({
        error: `You can only add up to ${userCommentLimit} comments per post`,
      })
    }

    const ventCommentCount = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM vent_comments WHERE vent_id = $1`,
      [ventId]
    )

    if ((ventCommentCount.rows[0]?.count ?? 0) >= MAX_COMMENTS_PER_VENT) {
      return res.status(429).json({
        error: 'This post has reached its comment limit',
      })
    }

    let assetId: string | null = null
    let emoji: string | null = null
    let commentType: 'emoji' | 'gif' = 'emoji'

    if (parsed.type === 'emoji') {
      const validation = validateEmojiComment(parsed.emoji)
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error })
      }
      emoji = parsed.emoji
    } else {
      const gifValidation = validateGifComment(parsed.gif_id)
      if (!gifValidation.valid) {
        return res.status(400).json({ error: gifValidation.error })
      }

      if (!isKlipyConfigured()) {
        return res.status(503).json({
          error: 'GIF comments are not configured. Add KLIPY_API_KEY to server/.env',
        })
      }

      const gifHourlyCount = await query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM vent_comments
         WHERE user_id = $1
           AND comment_type = 'gif'
           AND created_at > now() - INTERVAL '1 hour'`,
        [userId]
      )

      if ((gifHourlyCount.rows[0]?.count ?? 0) >= MAX_GIF_COMMENTS_PER_USER_PER_HOUR) {
        return res.status(429).json({
          error: 'GIF comment limit reached. Please try again later.',
        })
      }

      const asset = await ingestKlipyGif({
        externalId: parsed.gif_id,
        expiresAt: new Date(ventCheck.expires_at),
      })
      assetId = asset.id
      commentType = 'gif'
    }

    const commentId = await createPublicId('c', 'vent_comments')
    const inserted = await query(
      `INSERT INTO vent_comments (id, vent_id, user_id, comment_type, emoji, asset_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, vent_id, user_id, comment_type, emoji, asset_id, created_at`,
      [commentId, ventId, userId, commentType, emoji, assetId]
    )

    const comments = await fetchCommentsForVent(ventId)
    const created = comments.find((c) => c.id === inserted.rows[0].id)

    return res.status(201).json({
      comment: created ? mapCommentRow(created) : inserted.rows[0],
    })
  } catch (err) {
    console.error('Create comment error:', err)
    return res.status(500).json({ error: 'Failed to add comment' })
  }
})

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const vent = await fetchVentByIdentifier(req.params.id)
    if (!vent) {
      return res.status(404).json({ error: 'Vent not found' })
    }

    const viewerId = req.user?.userId
    const isOwner = viewerId === vent.user_id

    if (!isOnWall(vent.expires_at) && !isOwner) {
      return res.status(404).json({ error: 'Vent not found' })
    }

    return res.json(vent)
  } catch (err) {
    console.error('Fetch vent error:', err)
    return res.status(500).json({ error: 'Failed to fetch vent' })
  }
})

router.post('/', requireAuth, async (req, res) => {
  const parsed = createVentSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  const { content, tag_ids, gif_id: rawGifId, contribute_to_globe } = parsed.data
  const trimmedContent = content.trim()
  const gifId = rawGifId?.trim() || null
  const userId = req.user!.userId
  const contributeToGlobe = contribute_to_globe !== false

  // Geocode outside the transaction; never block/fail post creation on lookup errors.
  // Raw IP is not stored — only rounded approximate location fields.
  const location = await resolveLocationFromRequest(req)

  const { pool } = await import('../db.js')
  const pgClient = await pool.connect()

  try {
    await pgClient.query('BEGIN')

    let assetId: string | null = null

    if (gifId) {
      const gifValidation = validateGifComment(gifId)
      if (!gifValidation.valid) {
        await pgClient.query('ROLLBACK')
        return res.status(400).json({ error: gifValidation.error })
      }

      if (!isKlipyConfigured()) {
        await pgClient.query('ROLLBACK')
        return res.status(503).json({
          error: 'GIF posts are not configured. Add KLIPY_API_KEY to server/.env',
        })
      }

      const gifHourlyCount = await pgClient.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM vents
         WHERE user_id = $1
           AND asset_id IS NOT NULL
           AND created_at > now() - INTERVAL '1 hour'`,
        [userId]
      )

      if ((gifHourlyCount.rows[0]?.count ?? 0) >= MAX_GIF_COMMENTS_PER_USER_PER_HOUR) {
        await pgClient.query('ROLLBACK')
        return res.status(429).json({
          error: 'GIF post limit reached. Please try again later.',
        })
      }
    }

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

    const slug = await generateUniqueVentSlug()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    if (gifId) {
      const asset = await ingestKlipyGif({
        externalId: gifId,
        expiresAt,
      })
      assetId = asset.id
    }

    const ventId = await createPublicId('v', 'vents', pgClient)
    const ventResult = await pgClient.query(
      `INSERT INTO vents (
         id, user_id, content, slug, expires_at, asset_id,
         contribute_to_globe,
         location_country_code, location_country, location_state, location_city,
         location_lat, location_lng
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, slug, user_id, content, created_at, expires_at, asset_id, contribute_to_globe`,
      [
        ventId,
        userId,
        trimmedContent,
        slug,
        expiresAt.toISOString(),
        assetId,
        contributeToGlobe,
        location.countryCode,
        location.country,
        location.state,
        location.city,
        location.lat,
        location.lng,
      ]
    )
    const vent = ventResult.rows[0]

    const tagCheck = await pgClient.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM mood_tags WHERE id = ANY($1::text[])',
      [tag_ids]
    )

    if ((tagCheck.rows[0]?.count ?? 0) !== tag_ids.length) {
      await pgClient.query('ROLLBACK')
      return res.status(400).json({ error: 'One or more mood tags are invalid' })
    }

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

/**
 * PATCH /api/vents/:id
 * Original poster only; only while the vent is still on the Wall.
 */
router.patch('/:id', requireAuth, async (req, res) => {
  const parsed = updateVentSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  const userId = req.user!.userId
  const { content, tag_ids, gif_id: rawGifId, remove_gif, contribute_to_globe } = parsed.data
  const trimmedContent = content.trim()
  const gifId = rawGifId?.trim() || null

  const ventId = await resolveVentIdOr404(req.params.id, res)
  if (!ventId) return

  const { pool } = await import('../db.js')
  const pgClient = await pool.connect()

  try {
    await pgClient.query('BEGIN')

    const existing = await pgClient.query<{
      id: string
      user_id: string
      expires_at: string
      asset_id: string | null
      content: string
      edit_count: number
    }>(
      `SELECT id, user_id, expires_at, asset_id, COALESCE(content, '') AS content,
              COALESCE(edit_count, 0)::int AS edit_count
       FROM vents WHERE id = $1 FOR UPDATE`,
      [ventId]
    )

    const vent = existing.rows[0]
    if (!vent) {
      await pgClient.query('ROLLBACK')
      return res.status(404).json({ error: 'Vent not found' })
    }

    if (vent.user_id !== userId) {
      await pgClient.query('ROLLBACK')
      return res.status(403).json({ error: 'You can only edit your own vents' })
    }

    if (!isOnWall(vent.expires_at)) {
      await pgClient.query('ROLLBACK')
      return res.status(403).json({
        error: 'This vent can only be edited while it is still on the Wall',
      })
    }

    if (vent.edit_count >= MAX_VENT_EDITS) {
      await pgClient.query('ROLLBACK')
      return res.status(429).json({
        error: `This vent has reached the edit limit (${MAX_VENT_EDITS} edits max while on the Wall)`,
        edit_count: vent.edit_count,
        max_edits: MAX_VENT_EDITS,
        edits_remaining: 0,
      })
    }

    let nextAssetId: string | null = vent.asset_id

    if (remove_gif) {
      nextAssetId = null
    } else if (gifId) {
      const gifValidation = validateGifComment(gifId)
      if (!gifValidation.valid) {
        await pgClient.query('ROLLBACK')
        return res.status(400).json({ error: gifValidation.error })
      }

      if (!isKlipyConfigured()) {
        await pgClient.query('ROLLBACK')
        return res.status(503).json({
          error: 'GIF posts are not configured. Add KLIPY_API_KEY to server/.env',
        })
      }

      const asset = await ingestKlipyGif({
        externalId: gifId,
        expiresAt: new Date(vent.expires_at),
      })
      nextAssetId = asset.id
    }

    if (!trimmedContent && !nextAssetId) {
      await pgClient.query('ROLLBACK')
      return res.status(400).json({ error: 'Add text, a GIF, or both' })
    }

    const tagCheck = await pgClient.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM mood_tags WHERE id = ANY($1::text[])',
      [tag_ids]
    )

    if ((tagCheck.rows[0]?.count ?? 0) !== tag_ids.length) {
      await pgClient.query('ROLLBACK')
      return res.status(400).json({ error: 'One or more mood tags are invalid' })
    }

    if (typeof contribute_to_globe === 'boolean') {
      await pgClient.query(
        `UPDATE vents
         SET content = $1,
             asset_id = $2,
             contribute_to_globe = $3,
             edit_count = edit_count + 1
         WHERE id = $4`,
        [trimmedContent, nextAssetId, contribute_to_globe, ventId]
      )
    } else {
      await pgClient.query(
        `UPDATE vents
         SET content = $1,
             asset_id = $2,
             edit_count = edit_count + 1
         WHERE id = $3`,
        [trimmedContent, nextAssetId, ventId]
      )
    }

    await pgClient.query('DELETE FROM vent_tags WHERE vent_id = $1', [ventId])
    for (const tagId of tag_ids) {
      await pgClient.query('INSERT INTO vent_tags (vent_id, tag_id) VALUES ($1, $2)', [
        ventId,
        tagId,
      ])
    }

    await pgClient.query('COMMIT')

    const updated = await fetchVentById(ventId)
    if (!updated) {
      return res.status(500).json({ error: 'Failed to load updated vent' })
    }

    return res.json(updated)
  } catch (err) {
    await pgClient.query('ROLLBACK')
    console.error('Update vent error:', err)
    return res.status(500).json({ error: 'Failed to update vent' })
  } finally {
    pgClient.release()
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const ventId = await resolveVentIdOr404(req.params.id, res)
    if (!ventId) return

    const result = await query(
      'DELETE FROM vents WHERE id = $1 AND user_id = $2 RETURNING id',
      [ventId, req.user!.userId]
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
  const emojiValidation = validateEmojiComment(emoji)
  if (!emojiValidation.valid) {
    return res.status(400).json({ error: emojiValidation.error })
  }

  const userId = req.user!.userId

  try {
    const ventId = await resolveVentIdOr404(req.params.id, res)
    if (!ventId) return

    const ventCheck = await ventAcceptsComments(ventId)
    if (!ventCheck.accepts) {
      return res.status(403).json({
        error: 'Reactions are only available while this post is on the Wall',
      })
    }

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

    const reactionId = await createPublicId('r', 'reactions')
    const inserted = await query(
      `INSERT INTO reactions (id, vent_id, user_id, emoji)
       VALUES ($1, $2, $3, $4)
       RETURNING id, vent_id, user_id, emoji, created_at`,
      [reactionId, ventId, userId, emoji]
    )

    return res.status(201).json({ action: 'added', reaction: inserted.rows[0] })
  } catch (err) {
    console.error('Reaction error:', err)
    return res.status(500).json({ error: 'Failed to update reaction' })
  }
})

export default router