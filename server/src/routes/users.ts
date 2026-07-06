import { Router } from 'express'
import { z } from 'zod'
import { query } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { fetchVentsWithRelations } from '../utils/vents.js'
import { MAX_POSTS_PER_DAY } from '../constants.js'

const router = Router()

const usernameSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
})

router.get('/me/profile', requireAuth, async (req, res) => {
  const userId = req.user!.userId

  try {
    const profileResult = await query(
      `SELECT id, username, email, created_at, last_post_date, post_count_today
       FROM users WHERE id = $1`,
      [userId]
    )

    const profile = profileResult.rows[0]
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' })
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const allVentsResult = await query(
      'SELECT id, created_at FROM vents WHERE user_id = $1',
      [userId]
    )
    const allVents = allVentsResult.rows

    const ventIds = allVents.map((v) => v.id)
    let totalReactions = 0

    if (ventIds.length > 0) {
      const reactionsResult = await query(
        'SELECT COUNT(*)::int AS count FROM reactions WHERE vent_id = ANY($1::uuid[])',
        [ventIds]
      )
      totalReactions = reactionsResult.rows[0]?.count || 0
    }

    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    const postsThisMonth = allVents.filter(
      (vent) => new Date(vent.created_at) >= thisMonth
    ).length

    const userVents = await fetchVentsWithRelations({
      userId,
      offset: 0,
      limit: 100,
      includeExpired: true,
    })

    const recentVents = userVents.filter(
      (vent) => new Date(vent.created_at) >= thirtyDaysAgo
    )

    const stats = {
      totalVents: allVents.length,
      totalReactions,
      joinedDate: profile.created_at,
      lastActiveDate: profile.last_post_date || profile.created_at,
      postsThisMonth,
      averageReactionsPerVent:
        allVents.length > 0
          ? Math.round((totalReactions / allVents.length) * 10) / 10
          : 0,
    }

    return res.json({
      profile,
      vents: recentVents,
      stats,
    })
  } catch (err) {
    console.error('Profile error:', err)
    return res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

router.patch('/me/username', requireAuth, async (req, res) => {
  const parsed = usernameSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid username' })
  }

  const { username } = parsed.data

  try {
    const existing = await query(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [username, req.user!.userId]
    )
    if (existing.rowCount) {
      return res.status(409).json({ error: 'Username is already taken' })
    }

    const result = await query(
      `UPDATE users SET username = $1 WHERE id = $2
       RETURNING id, username, email, created_at, last_post_date, post_count_today`,
      [username, req.user!.userId]
    )

    return res.json({ user: result.rows[0] })
  } catch (err) {
    console.error('Username update error:', err)
    return res.status(500).json({ error: 'Failed to update username' })
  }
})

router.get('/me/post-limits', requireAuth, async (req, res) => {
  try {
    const result = await query(
      'SELECT post_count_today, last_post_date FROM users WHERE id = $1',
      [req.user!.userId]
    )

    const user = result.rows[0]
    const today = new Date().toISOString().split('T')[0]
    const postsToday = user.last_post_date === today ? user.post_count_today : 0
    const canPost = postsToday < MAX_POSTS_PER_DAY

    let timeUntilReset: string | null = null
    if (!canPost) {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      const msUntilReset = tomorrow.getTime() - now.getTime()
      const hours = Math.floor(msUntilReset / 3_600_000)
      const minutes = Math.floor((msUntilReset % 3_600_000) / 60_000)
      timeUntilReset = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
    }

    return res.json({
      canPost,
      postsToday,
      maxPosts: MAX_POSTS_PER_DAY,
      timeUntilReset,
    })
  } catch (err) {
    console.error('Post limits error:', err)
    return res.status(500).json({ error: 'Failed to check post limits' })
  }
})

export default router