import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';
const router = Router();
const registerSchema = z.object({
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
    email: z.string().email(),
    password: z.string().min(6),
});
const loginSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
});
router.post('/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' });
    }
    const { username, email, password } = parsed.data;
    try {
        const existing = await query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (existing.rowCount) {
            return res.status(409).json({ error: 'Username or email already taken' });
        }
        const passwordHash = await bcrypt.hash(password, 12);
        const result = await query(`INSERT INTO users (username, email, password_hash, last_post_date, post_count_today)
       VALUES ($1, $2, $3, CURRENT_DATE, 0)
       RETURNING id, username, email, created_at, last_post_date, post_count_today`, [username, email, passwordHash]);
        const user = result.rows[0];
        const token = signToken({ userId: user.id, username: user.username });
        return res.status(201).json({ token, user });
    }
    catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ error: 'Failed to create account' });
    }
});
router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    const { username, password } = parsed.data;
    try {
        const result = await query(`SELECT id, username, email, password_hash, created_at, last_post_date, post_count_today
       FROM users WHERE username = $1`, [username]);
        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        const { password_hash: _, ...safeUser } = user;
        const token = signToken({ userId: user.id, username: user.username });
        return res.json({ token, user: safeUser });
    }
    catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Failed to sign in' });
    }
});
router.get('/me', requireAuth, async (req, res) => {
    try {
        const result = await query(`SELECT id, username, email, created_at, last_post_date, post_count_today
       FROM users WHERE id = $1`, [req.user.userId]);
        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json({ user });
    }
    catch (err) {
        console.error('Me error:', err);
        return res.status(500).json({ error: 'Failed to fetch user' });
    }
});
export default router;
