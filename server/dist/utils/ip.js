import crypto from 'crypto';
import { getJwtSecret } from '../config/env.js';
function getIpHashSecret() {
    const dedicated = process.env.IP_HASH_SECRET;
    if (dedicated)
        return dedicated;
    if (process.env.NODE_ENV === 'production') {
        throw new Error('IP_HASH_SECRET must be set in production');
    }
    return getJwtSecret();
}
export function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
        return forwarded[0].split(',')[0].trim();
    }
    return req.socket.remoteAddress || req.ip || 'unknown';
}
export function hashIp(ip) {
    return crypto.createHmac('sha256', getIpHashSecret()).update(ip).digest('hex');
}
export function hashClientIp(req) {
    return hashIp(getClientIp(req));
}
