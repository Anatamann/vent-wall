import { query } from '../db.js';
import { createPublicId } from './ids.js';
import { IP_REGISTRATION_BLOCK_HOURS, MAX_ACCOUNTS_PER_IP_PER_DAY, MAX_REGISTRATION_ATTEMPTS_PER_HOUR, } from '../constants.js';
export async function checkRegistrationAllowed(ipHash) {
    const blocked = await query(`SELECT reason FROM blocked_ip_hashes
     WHERE ip_hash = $1
       AND (expires_at IS NULL OR expires_at > now())
     LIMIT 1`, [ipHash]);
    if (blocked.rowCount) {
        return {
            allowed: false,
            reason: 'Account creation is temporarily blocked from your network. Please try again later.',
        };
    }
    const recentAccounts = await query(`SELECT COUNT(*)::int AS count
     FROM users
     WHERE registration_ip_hash = $1
       AND created_at > now() - INTERVAL '24 hours'`, [ipHash]);
    const accountCount = recentAccounts.rows[0]?.count ?? 0;
    if (accountCount >= MAX_ACCOUNTS_PER_IP_PER_DAY) {
        return {
            allowed: false,
            reason: `Account limit reached. Only ${MAX_ACCOUNTS_PER_IP_PER_DAY} accounts can be created per day from the same network.`,
        };
    }
    const recentAttempts = await query(`SELECT COUNT(*)::int AS count
     FROM registration_attempts
     WHERE ip_hash = $1
       AND created_at > now() - INTERVAL '1 hour'`, [ipHash]);
    const attemptCount = recentAttempts.rows[0]?.count ?? 0;
    if (attemptCount >= MAX_REGISTRATION_ATTEMPTS_PER_HOUR) {
        await blockIpHash(ipHash, 'Too many registration attempts', IP_REGISTRATION_BLOCK_HOURS);
        return {
            allowed: false,
            reason: 'Too many registration attempts. Please try again later.',
        };
    }
    return { allowed: true };
}
export async function recordRegistrationAttempt(ipHash, succeeded) {
    const attemptId = await createPublicId('g', 'registration_attempts');
    await query(`INSERT INTO registration_attempts (id, ip_hash, succeeded)
     VALUES ($1, $2, $3)`, [attemptId, ipHash, succeeded]);
}
export async function blockIpHash(ipHash, reason, blockHours) {
    const expiresAt = blockHours
        ? new Date(Date.now() + blockHours * 60 * 60 * 1000).toISOString()
        : null;
    await query(`INSERT INTO blocked_ip_hashes (ip_hash, reason, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (ip_hash) DO UPDATE
       SET reason = EXCLUDED.reason,
           blocked_at = now(),
           expires_at = EXCLUDED.expires_at`, [ipHash, reason, expiresAt]);
}
