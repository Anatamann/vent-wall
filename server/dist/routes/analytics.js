import { Router } from 'express';
import { query } from '../db.js';
const router = Router();
router.get('/trending', async (_req, res) => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const tagUsageResult = await query(`
      SELECT
        vt.tag_id,
        mt.id,
        mt.name,
        mt.color,
        mt.emoji,
        mt.created_at,
        v.created_at AS vent_created_at
      FROM vent_tags vt
      JOIN mood_tags mt ON mt.id = vt.tag_id
      JOIN vents v ON v.id = vt.vent_id
      WHERE v.created_at >= $1 AND v.expires_at >= now()
      `, [weekAgo.toISOString()]);
        const tagStats = {};
        for (const row of tagUsageResult.rows) {
            if (!tagStats[row.tag_id]) {
                tagStats[row.tag_id] = {
                    id: row.id,
                    name: row.name,
                    color: row.color,
                    emoji: row.emoji,
                    created_at: row.created_at,
                    usage_count: 0,
                    recent_usage: 0,
                    growth_rate: 0,
                };
            }
            tagStats[row.tag_id].usage_count++;
            if (new Date(row.vent_created_at) >= yesterday) {
                tagStats[row.tag_id].recent_usage++;
            }
        }
        const trendingTags = Object.values(tagStats)
            .map((tag) => ({
            ...tag,
            growth_rate: tag.usage_count > 0 ? (tag.recent_usage / tag.usage_count) * 100 : 0,
        }))
            .sort((a, b) => {
            const aScore = a.recent_usage * 2 + a.growth_rate;
            const bScore = b.recent_usage * 2 + b.growth_rate;
            return bScore - aScore;
        })
            .slice(0, 10);
        const emojiResult = await query(`
      SELECT emoji, COUNT(*)::int AS count
      FROM reactions
      WHERE created_at >= $1
      GROUP BY emoji
      ORDER BY count DESC
      LIMIT 10
      `, [weekAgo.toISOString()]);
        const peakHoursResult = await query(`
      SELECT EXTRACT(HOUR FROM created_at)::int AS hour, COUNT(*)::int AS count
      FROM vents
      WHERE created_at >= $1 AND expires_at >= now()
      GROUP BY hour
      ORDER BY hour
      `, [weekAgo.toISOString()]);
        const ventsTodayResult = await query(`SELECT COUNT(*)::int AS count FROM vents WHERE created_at >= $1`, [today.toISOString()]);
        const reactionsTodayResult = await query(`SELECT COUNT(*)::int AS count FROM reactions WHERE created_at >= $1`, [today.toISOString()]);
        return res.json({
            trendingTags,
            popularEmojis: emojiResult.rows.map((r) => ({
                emoji: r.emoji,
                count: Number(r.count),
            })),
            peakHours: peakHoursResult.rows.map((r) => ({
                hour: r.hour,
                count: Number(r.count),
            })),
            totalVentsToday: Number(ventsTodayResult.rows[0]?.count || 0),
            totalReactionsToday: Number(reactionsTodayResult.rows[0]?.count || 0),
        });
    }
    catch (err) {
        console.error('Trending error:', err);
        return res.status(500).json({ error: 'Failed to fetch trending analysis' });
    }
});
export default router;
