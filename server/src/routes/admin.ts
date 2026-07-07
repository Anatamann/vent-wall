import { Router } from 'express'
import { z } from 'zod'
import { query } from '../db.js'
import { requireAdmin } from '../middleware/admin.js'

const router = Router()

router.use(requireAdmin)

const updateFeedbackSchema = z.object({
  status: z.enum(['new', 'triaged', 'planned', 'closed']).optional(),
  admin_note: z.string().max(500).optional(),
})

router.get('/overview', async (_req, res) => {
  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      ventsToday,
      reactionsToday,
      commentsToday,
      gifCommentsToday,
      newUsersToday,
      newFeedback,
      topTags,
      topEmojis,
    ] = await Promise.all([
      query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM vents WHERE created_at >= $1`,
        [today.toISOString()]
      ),
      query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM reactions WHERE created_at >= $1`,
        [today.toISOString()]
      ),
      query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM vent_comments WHERE created_at >= $1`,
        [today.toISOString()]
      ),
      query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM vent_comments
         WHERE comment_type = 'gif' AND created_at >= $1`,
        [today.toISOString()]
      ),
      query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM users WHERE created_at >= $1`,
        [today.toISOString()]
      ),
      query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM user_feedback WHERE status = 'new'`
      ),
      query<{ name: string; emoji: string; color: string; count: number }>(
        `
        SELECT mt.name, mt.emoji, mt.color, COUNT(*)::int AS count
        FROM vent_tags vt
        JOIN mood_tags mt ON mt.id = vt.tag_id
        JOIN vents v ON v.id = vt.vent_id
        WHERE v.created_at >= $1 AND v.expires_at >= now()
        GROUP BY mt.id, mt.name, mt.emoji, mt.color
        ORDER BY count DESC
        LIMIT 5
        `,
        [weekAgo.toISOString()]
      ),
      query<{ emoji: string; count: number }>(
        `
        SELECT emoji, COUNT(*)::int AS count
        FROM reactions
        WHERE created_at >= $1
        GROUP BY emoji
        ORDER BY count DESC
        LIMIT 5
        `,
        [weekAgo.toISOString()]
      ),
    ])

    return res.json({
      totals: {
        vents_today: ventsToday.rows[0]?.count ?? 0,
        reactions_today: reactionsToday.rows[0]?.count ?? 0,
        comments_today: commentsToday.rows[0]?.count ?? 0,
        gif_comments_today: gifCommentsToday.rows[0]?.count ?? 0,
        new_users_today: newUsersToday.rows[0]?.count ?? 0,
      },
      new_feedback_count: newFeedback.rows[0]?.count ?? 0,
      top_tags: topTags.rows,
      top_emojis: topEmojis.rows,
    })
  } catch (err) {
    console.error('Admin overview error:', err)
    return res.status(500).json({ error: 'Failed to load overview' })
  }
})

router.get('/feedback', async (req, res) => {
  try {
    const status = String(req.query.status || 'new')
    const page = Math.max(1, Number(req.query.page || 1))
    const perPage = Math.min(50, Math.max(10, Number(req.query.per_page || 20)))
    const offset = (page - 1) * perPage

    const allowedStatuses = ['new', 'triaged', 'planned', 'closed', 'all']
    const statusFilter = allowedStatuses.includes(status) ? status : 'new'

    const conditions =
      statusFilter === 'all' ? '' : `WHERE f.status = $1`

    const params = statusFilter === 'all' ? [perPage, offset] : [statusFilter, perPage, offset]
    const limitOffsetParams =
      statusFilter === 'all' ? '$1 OFFSET $2' : '$2 OFFSET $3'

    const result = await query<{
      id: string
      tag_request: string
      message: string
      status: string
      admin_note: string | null
      created_at: string
      username: string
    }>(
      `
      SELECT
        f.id,
        f.tag_request,
        f.message,
        f.status,
        f.admin_note,
        f.created_at,
        u.username
      FROM user_feedback f
      JOIN users u ON u.id = f.user_id
      ${conditions}
      ORDER BY f.created_at DESC
      LIMIT ${limitOffsetParams}
      `,
      params
    )

    const countResult = await query<{ count: number }>(
      statusFilter === 'all'
        ? `SELECT COUNT(*)::int AS count FROM user_feedback`
        : `SELECT COUNT(*)::int AS count FROM user_feedback WHERE status = $1`,
      statusFilter === 'all' ? [] : [statusFilter]
    )

    return res.json({
      items: result.rows,
      page,
      per_page: perPage,
      total: countResult.rows[0]?.count ?? 0,
    })
  } catch (err) {
    console.error('Admin feedback list error:', err)
    return res.status(500).json({ error: 'Failed to load feedback' })
  }
})

router.patch('/feedback/:id', async (req, res) => {
  const parsed = updateFeedbackSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' })
  }

  const { status, admin_note } = parsed.data
  if (!status && admin_note === undefined) {
    return res.status(400).json({ error: 'Nothing to update' })
  }

  try {
    const existing = await query(
      `SELECT id FROM user_feedback WHERE id = $1`,
      [req.params.id]
    )
    if (!existing.rowCount) {
      return res.status(404).json({ error: 'Feedback not found' })
    }

    const updated = await query<{
      id: string
      tag_request: string
      message: string
      status: string
      admin_note: string | null
      created_at: string
      username: string
    }>(
      `
      UPDATE user_feedback
      SET
        status = COALESCE($2, status),
        admin_note = COALESCE($3, admin_note),
        reviewed_by = $4,
        reviewed_at = now()
      WHERE id = $1
      RETURNING id, tag_request, message, status, admin_note, created_at,
        (SELECT username FROM users WHERE id = user_feedback.user_id) AS username
      `,
      [req.params.id, status ?? null, admin_note ?? null, req.user!.userId]
    )

    await query(
      `INSERT INTO admin_audit_log (admin_user_id, action, target_type, target_id, metadata)
       VALUES ($1, 'feedback_update', 'user_feedback', $2, $3)`,
      [
        req.user!.userId,
        req.params.id,
        JSON.stringify({ status, admin_note: admin_note ?? null }),
      ]
    )

    return res.json({ feedback: updated.rows[0] })
  } catch (err) {
    console.error('Admin feedback update error:', err)
    return res.status(500).json({ error: 'Failed to update feedback' })
  }
})

export default router