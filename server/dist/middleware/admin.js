import { isAdminUser } from '../config/admin.js';
import { requireAuth } from './auth.js';
export function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (!req.user || !isAdminUser(req.user.userId)) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
}
