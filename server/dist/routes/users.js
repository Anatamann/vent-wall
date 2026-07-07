import { Router } from 'express';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import { pipeline } from 'stream/promises';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { fetchVentsWithRelations } from '../utils/vents.js';
import { MAX_POSTS_PER_DAY } from '../constants.js';
import { isUsernameTaken, normalizeUsername, validateUsernameFormat } from '../utils/username.js';
import { validateGifComment } from '../utils/comments.js';
import { isKlipyConfigured } from '../providers/klipy.js';
import { AvatarProcessingError, deleteUserAvatarFiles, setUserAvatarFromKlipy, } from '../utils/avatar-assets.js';
import { resolveMediaAbsolutePath } from '../utils/media-assets.js';
import { enrichUser, USER_PUBLIC_FIELDS } from '../utils/user-profile.js';
import { isLooseUuid } from '../utils/validation.js';
import { normalizeStatus, validateStatusFormat } from '../utils/status.js';
const router = Router();
const usernameSchema = z.object({
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
});
const avatarSchema = z.object({
    gif_id: z.string().trim().min(1),
});
const statusSchema = z.object({
    status: z.string().max(30),
});
router.get('/avatars/:userId', async (req, res) => {
    if (!isLooseUuid(req.params.userId)) {
        return res.status(404).json({ error: 'Avatar not found' });
    }
    try {
        const result = await query('SELECT avatar_path, avatar_mime_type FROM users WHERE id = $1', [req.params.userId]);
        const user = result.rows[0];
        if (!user?.avatar_path) {
            return res.status(404).json({ error: 'Avatar not found' });
        }
        const absolutePath = resolveMediaAbsolutePath(user.avatar_path);
        await fs.access(absolutePath);
        res.setHeader('Content-Type', user.avatar_mime_type || 'image/gif');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        await pipeline(createReadStream(absolutePath), res);
    }
    catch {
        return res.status(404).json({ error: 'Avatar not found' });
    }
});
router.get('/me/profile', requireAuth, async (req, res) => {
    const userId = req.user.userId;
    try {
        const profileResult = await query(`SELECT ${USER_PUBLIC_FIELDS} FROM users WHERE id = $1`, [userId]);
        const profile = profileResult.rows[0];
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        const allVentsResult = await query('SELECT id, created_at FROM vents WHERE user_id = $1', [userId]);
        const allVents = allVentsResult.rows;
        const ventIds = allVents.map((v) => v.id);
        let totalReactions = 0;
        if (ventIds.length > 0) {
            const reactionsResult = await query('SELECT COUNT(*)::int AS count FROM reactions WHERE vent_id = ANY($1::uuid[])', [ventIds]);
            totalReactions = reactionsResult.rows[0]?.count || 0;
        }
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        const postsThisMonth = allVents.filter((vent) => new Date(vent.created_at) >= thisMonth).length;
        const userVents = await fetchVentsWithRelations({
            userId,
            offset: 0,
            limit: 500,
            includeExpired: true,
        });
        const stats = {
            totalVents: allVents.length,
            totalReactions,
            joinedDate: profile.created_at,
            lastActiveDate: profile.last_post_date || profile.created_at,
            postsThisMonth,
            averageReactionsPerVent: allVents.length > 0
                ? Math.round((totalReactions / allVents.length) * 10) / 10
                : 0,
        };
        return res.json({
            profile: enrichUser(profile),
            vents: userVents,
            stats,
        });
    }
    catch (err) {
        console.error('Profile error:', err);
        return res.status(500).json({ error: 'Failed to fetch profile' });
    }
});
router.post('/me/avatar', requireAuth, async (req, res) => {
    const parsed = avatarSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'gif_id is required' });
    }
    const gifValidation = validateGifComment(parsed.data.gif_id);
    if (!gifValidation.valid) {
        return res.status(400).json({ error: gifValidation.error });
    }
    if (!isKlipyConfigured()) {
        return res.status(503).json({
            error: 'GIF profile pictures are not configured. Add KLIPY_API_KEY to server/.env',
        });
    }
    const userId = req.user.userId;
    try {
        const saved = await setUserAvatarFromKlipy(userId, parsed.data.gif_id);
        const result = await query(`UPDATE users
       SET avatar_path = $1,
           avatar_mime_type = $2,
           avatar_klipy_id = $3,
           avatar_updated_at = now()
       WHERE id = $4
       RETURNING ${USER_PUBLIC_FIELDS}`, [saved.relativePath, saved.mimeType, saved.klipyId, userId]);
        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json({ user: enrichUser(user) });
    }
    catch (err) {
        if (err instanceof AvatarProcessingError) {
            return res.status(400).json({ error: err.message });
        }
        console.error('Avatar set error:', err);
        return res.status(500).json({ error: 'Failed to set profile picture' });
    }
});
router.patch('/me/status', requireAuth, async (req, res) => {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    const status = normalizeStatus(parsed.data.status);
    const format = validateStatusFormat(status);
    if (!format.valid) {
        return res.status(400).json({ error: format.error });
    }
    try {
        const result = await query(`UPDATE users SET status = $1 WHERE id = $2
       RETURNING ${USER_PUBLIC_FIELDS}`, [status || null, req.user.userId]);
        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json({ user: enrichUser(user) });
    }
    catch (err) {
        console.error('Status update error:', err);
        return res.status(500).json({ error: 'Failed to update status' });
    }
});
router.delete('/me/avatar', requireAuth, async (req, res) => {
    const userId = req.user.userId;
    try {
        await deleteUserAvatarFiles(userId);
        const result = await query(`UPDATE users
       SET avatar_path = NULL,
           avatar_mime_type = NULL,
           avatar_klipy_id = NULL,
           avatar_updated_at = NULL
       WHERE id = $1
       RETURNING ${USER_PUBLIC_FIELDS}`, [userId]);
        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json({ user: enrichUser(user) });
    }
    catch (err) {
        console.error('Avatar delete error:', err);
        return res.status(500).json({ error: 'Failed to remove profile picture' });
    }
});
router.patch('/me/username', requireAuth, async (req, res) => {
    const parsed = usernameSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid username' });
    }
    const username = normalizeUsername(parsed.data.username);
    const format = validateUsernameFormat(username);
    if (!format.valid) {
        return res.status(400).json({ error: format.error });
    }
    try {
        if (await isUsernameTaken(username, req.user.userId)) {
            return res.status(409).json({ error: 'This username is already taken' });
        }
        const result = await query(`UPDATE users SET username = $1 WHERE id = $2
       RETURNING ${USER_PUBLIC_FIELDS}`, [username, req.user.userId]);
        return res.json({ user: enrichUser(result.rows[0]) });
    }
    catch (err) {
        console.error('Username update error:', err);
        return res.status(500).json({ error: 'Failed to update username' });
    }
});
router.get('/me/post-limits', requireAuth, async (req, res) => {
    try {
        const result = await query('SELECT post_count_today, last_post_date FROM users WHERE id = $1', [req.user.userId]);
        const user = result.rows[0];
        const today = new Date().toISOString().split('T')[0];
        const postsToday = user.last_post_date === today ? user.post_count_today : 0;
        const canPost = postsToday < MAX_POSTS_PER_DAY;
        let timeUntilReset = null;
        if (!canPost) {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            const msUntilReset = tomorrow.getTime() - now.getTime();
            const hours = Math.floor(msUntilReset / 3_600_000);
            const minutes = Math.floor((msUntilReset % 3_600_000) / 60_000);
            timeUntilReset = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        }
        return res.json({
            canPost,
            postsToday,
            maxPosts: MAX_POSTS_PER_DAY,
            timeUntilReset,
        });
    }
    catch (err) {
        console.error('Post limits error:', err);
        return res.status(500).json({ error: 'Failed to check post limits' });
    }
});
export default router;
