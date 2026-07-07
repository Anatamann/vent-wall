import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { REPORT_REASONS } from '../constants.js';
const router = Router();
const reportSchema = z.object({
    vent_id: z.string().uuid(),
    reason: z.enum(REPORT_REASONS),
    details: z.string().max(500).optional(),
});
router.post('/', requireAuth, async (req, res) => {
    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' });
    }
    const { vent_id, reason, details } = parsed.data;
    try {
        const vent = await query('SELECT id FROM vents WHERE id = $1', [vent_id]);
        if (!vent.rowCount) {
            return res.status(404).json({ error: 'Vent not found' });
        }
        const result = await query(`INSERT INTO reports (vent_id, reporter_id, reason, details)
       VALUES ($1, $2, $3, $4)
       RETURNING id, vent_id, reason, status, created_at`, [vent_id, req.user.userId, reason, details?.trim() || null]);
        return res.status(201).json({ report: result.rows[0] });
    }
    catch (err) {
        if (typeof err === 'object' &&
            err !== null &&
            'code' in err &&
            err.code === '23505') {
            return res.status(409).json({ error: 'You have already reported this post' });
        }
        console.error('Report error:', err);
        return res.status(500).json({ error: 'Failed to submit report' });
    }
});
export default router;
