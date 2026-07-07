import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/env.js';
export function signToken(payload) {
    return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}
export function verifyToken(token) {
    return jwt.verify(token, getJwtSecret());
}
export function optionalAuth(req, _res, next) {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
        try {
            req.user = verifyToken(header.slice(7));
        }
        catch {
            // Treat invalid tokens as anonymous for public routes
        }
    }
    next();
}
export function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    try {
        const token = header.slice(7);
        req.user = verifyToken(token);
        next();
    }
    catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
