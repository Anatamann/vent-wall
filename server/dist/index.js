import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { pool } from './db.js';
import { validateEnv } from './config/env.js';
import authRoutes from './routes/auth.js';
import moodTagRoutes from './routes/mood-tags.js';
import ventRoutes from './routes/vents.js';
import userRoutes from './routes/users.js';
import analyticsRoutes from './routes/analytics.js';
import feedbackRoutes from './routes/feedback.js';
import adminRoutes from './routes/admin.js';
import mediaRoutes from './routes/media.js';
import { startMediaCleanupJob } from './jobs/media-cleanup.js';
import { ensureMediaDirs } from './utils/media-assets.js';
import { ensureAvatarDir } from './utils/avatar-assets.js';
import { MAX_AVATAR_CHANGES_PER_HOUR } from './constants.js';
import { getClientIp } from './utils/ip.js';
dotenv.config();
validateEnv();
const app = express();
const PORT = Number(process.env.PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
app.set('trust proxy', 1);
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '16kb' }));
const isDev = process.env.NODE_ENV !== 'production';
app.get('/api/health', async (_req, res) => {
    if (isDev) {
        try {
            await pool.query('SELECT 1');
            return res.json({ status: 'ok', database: 'connected' });
        }
        catch {
            return res.status(503).json({ status: 'error', database: 'disconnected' });
        }
    }
    return res.json({ status: 'ok' });
});
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 2000 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 500 : 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later.' },
});
const usernameCheckLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 500 : 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many username checks, please try again later.' },
});
const gifSearchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: isDev ? 200 : 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many GIF searches, please slow down.' },
});
const commentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 500 : 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIp(req),
    message: { error: 'Too many comments, please try again later.' },
});
const avatarChangeLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: MAX_AVATAR_CHANGES_PER_HOUR,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.userId || getClientIp(req),
    message: { error: 'Too many profile picture changes, please try again later.' },
});
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDev ? 500 : 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.userId || getClientIp(req),
    message: { error: 'Too many admin requests, please slow down.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/check-username', usernameCheckLimiter);
app.use('/api/media/gifs/search', gifSearchLimiter);
app.use('/api/vents/:id/comments', commentLimiter);
app.use('/api/users/me/avatar', avatarChangeLimiter);
app.use('/api/admin', adminLimiter);
app.use('/api', generalLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/mood-tags', moodTagRoutes);
app.use('/api/vents', ventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/media', mediaRoutes);
async function bootstrap() {
    await ensureMediaDirs();
    await ensureAvatarDir();
    startMediaCleanupJob();
    app.listen(PORT, () => {
        console.log(`Vent Wall API running on http://localhost:${PORT}`);
    });
}
bootstrap().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
