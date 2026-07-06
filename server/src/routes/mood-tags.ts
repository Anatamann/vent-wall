import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const result = await query(
      'SELECT id, name, color, emoji, created_at FROM mood_tags ORDER BY name'
    )
    return res.json(result.rows)
  } catch (err) {
    console.error('Mood tags error:', err)
    return res.status(500).json({ error: 'Failed to fetch mood tags' })
  }
})

export default router