import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { hashClientIp } from '../utils/ip.js';
import { checkRegistrationAllowed, recordRegistrationAttempt, } from '../utils/registration-guard.js';
import { isUsernameTaken, normalizeUsername, validateUsernameFormat, } from '../utils/username.js';
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
router.get('/check-username', async (req, res) => {
    const username = String(req.query.username || '');
    const format = validateUsernameFormat(username);
    if (!format.valid) {
        return res.json({
            available: false,
            reason: format.error,
        });
    }
    try {
        const taken = await isUsernameTaken(username);
        return res.json({
            available: !taken,
            reason: taken ? 'This username is already taken' : undefined,
        });
    }
    catch (err) {
        console.error('Check username error:', err);
        return res.status(500).json({ error: 'Failed to check username' });
    }
});
router.post('/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' });
    }
    const username = normalizeUsername(parsed.data.username);
    const { email, password } = parsed.data;
    const ipHash = hashClientIp(req);
    const format = validateUsernameFormat(username);
    if (!format.valid) {
        return res.status(400).json({ error: format.error });
    }
    try {
        const guard = await checkRegistrationAllowed(ipHash);
        if (!guard.allowed) {
            await recordRegistrationAttempt(ipHash, false);
            return res.status(429).json({ error: guard.reason });
        }
        if (await isUsernameTaken(username)) {
            await recordRegistrationAttempt(ipHash, false);
            return res.status(409).json({ error: 'This username is already taken' });
        }
        const emailTaken = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
        if (emailTaken.rowCount) {
            await recordRegistrationAttempt(ipHash, false);
            return res.status(409).json({ error: 'This email is already registered' });
        }
        const passwordHash = await bcrypt.hash(password, 12);
        const result = await query(`INSERT INTO users (username, email, password_hash, registration_ip_hash, last_post_date, post_count_today)
       VALUES ($1, $2, $3, $4, CURRENT_DATE, 0)
       RETURNING id, username, email, created_at, last_post_date, post_count_today`, [username, email, passwordHash, ipHash]);
        await recordRegistrationAttempt(ipHash, true);
        const user = result.rows[0];
        const token = signToken({ userId: user.id, username: user.username });
        return res.status(201).json({ token, user });
    }
    catch (err) {
        if (typeof err === 'object' &&
            err !== null &&
            'code' in err &&
            err.code === '23505') {
            await recordRegistrationAttempt(ipHash, false);
            return res.status(409).json({ error: 'This username is already taken' });
        }
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
       FROM users WHERE LOWER(username) = LOWER($1)`, [normalizeUsername(username)]);
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
