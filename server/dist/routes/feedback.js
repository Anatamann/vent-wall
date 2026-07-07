import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
const submitFeedbackSchema = z.object({
    tag_request: z.string().max(80).optional().default(''),
    message: z.string().trim().min(1).max(1000),
});
router.get('/status', requireAuth, async (req, res) => {
    try {
        const result = await query(`SELECT id, user_id, feedback_date, tag_request, message, status, created_at
       FROM user_feedback
       WHERE user_id = $1 AND feedback_date = CURRENT_DATE
       LIMIT 1`, [req.user.userId]);
        return res.json({
            submitted_today: (result.rowCount ?? 0) > 0,
            feedback: result.rows[0] ?? null,
        });
    }
    catch (err) {
        console.error('Feedback status error:', err);
        return res.status(500).json({ error: 'Failed to check feedback status' });
    }
});
router.post('/', requireAuth, async (req, res) => {
    const parsed = submitFeedbackSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' });
    }
    const { tag_request, message } = parsed.data;
    const userId = req.user.userId;
    try {
        const existing = await query(`SELECT id FROM user_feedback
       WHERE user_id = $1 AND feedback_date = CURRENT_DATE
       LIMIT 1`, [userId]);
        if (existing.rowCount) {
            return res.status(429).json({
                error: 'You can only send one feedback message per day. Try again tomorrow.',
            });
        }
        const inserted = await query(`INSERT INTO user_feedback (user_id, tag_request, message)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, feedback_date, tag_request, message, status, created_at`, [userId, tag_request.trim(), message]);
        return res.status(201).json({ feedback: inserted.rows[0] });
    }
    catch (err) {
        if (typeof err === 'object' &&
            err !== null &&
            'code' in err &&
            err.code === '23505') {
            return res.status(429).json({
                error: 'You can only send one feedback message per day. Try again tomorrow.',
            });
        }
        console.error('Submit feedback error:', err);
        return res.status(500).json({ error: 'Failed to submit feedback' });
    }
});
export default router;
