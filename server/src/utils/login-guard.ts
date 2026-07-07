import { query } from '../db.js'
import { MAX_LOGIN_FAILURES_PER_HOUR } from '../constants.js'

export type LoginGuardResult =
  | { allowed: true }
  | { allowed: false; reason: string }

export async function checkLoginAllowed(
  ipHash: string,
  username: string
): Promise<LoginGuardResult> {
  const normalized = username.trim().toLowerCase()

  const result = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM login_attempts
     WHERE succeeded = false
       AND created_at > now() - INTERVAL '1 hour'
       AND (ip_hash = $1 OR username_normalized = $2)`,
    [ipHash, normalized]
  )

  const failures = result.rows[0]?.count ?? 0
  if (failures >= MAX_LOGIN_FAILURES_PER_HOUR) {
    return {
      allowed: false,
      reason: 'Too many failed sign-in attempts. Please try again later.',
    }
  }

  return { allowed: true }
}

export async function recordLoginAttempt(
  ipHash: string,
  username: string,
  succeeded: boolean
): Promise<void> {
  await query(
    `INSERT INTO login_attempts (ip_hash, username_normalized, succeeded)
     VALUES ($1, $2, $3)`,
    [ipHash, username.trim().toLowerCase(), succeeded]
  )
}