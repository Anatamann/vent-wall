import { query } from '../db.js';
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;
export function normalizeUsername(username) {
    return username.trim();
}
export function validateUsernameFormat(username) {
    const normalized = normalizeUsername(username);
    if (!normalized) {
        return { valid: false, error: 'Username is required' };
    }
    if (normalized.length < USERNAME_MIN_LENGTH || normalized.length > USERNAME_MAX_LENGTH) {
        return {
            valid: false,
            error: `Username must be between ${USERNAME_MIN_LENGTH} and ${USERNAME_MAX_LENGTH} characters`,
        };
    }
    if (!USERNAME_REGEX.test(normalized)) {
        return {
            valid: false,
            error: 'Username can only contain letters, numbers, underscores, and hyphens',
        };
    }
    return { valid: true };
}
export async function isUsernameTaken(username, excludeUserId) {
    const normalized = normalizeUsername(username);
    const result = excludeUserId
        ? await query('SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2 LIMIT 1', [normalized, excludeUserId])
        : await query('SELECT id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1', [normalized]);
    return (result.rowCount ?? 0) > 0;
}
