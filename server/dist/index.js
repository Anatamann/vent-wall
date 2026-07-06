import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { pool } from './db.js';
import authRoutes from './routes/auth.js';
import moodTagRoutes from './routes/mood-tags.js';
import ventRoutes from './routes/vents.js';
import userRoutes from './routes/users.js';
import analyticsRoutes from './routes/analytics.js';
import reportRoutes from './routes/reports.js';
dotenv.config();
const app = express();
const PORT = Number(process.env.PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
const isDev = process.env.NODE_ENV !== 'production';
app.get('/api/health', async (_req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    }
    catch {
        res.status(503).json({ status: 'error', database: 'disconnected' });
    }
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
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', generalLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/mood-tags', moodTagRoutes);
app.use('/api/vents', ventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.listen(PORT, () => {
    console.log(`Vent Wall API running on http://localhost:${PORT}`);
});
