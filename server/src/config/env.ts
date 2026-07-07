const DEV_JWT_SECRET = 'dev-secret-change-me'
const WEAK_SECRETS = new Set([
  DEV_JWT_SECRET,
  'change-this-to-a-long-random-string-in-production',
  'change-this-to-another-long-random-string-in-production',
])

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

function isStrongSecret(value: string | undefined): boolean {
  return Boolean(value && value.length >= 32 && !WEAK_SECRETS.has(value))
}

export function validateEnv(): void {
  if (!isProduction()) return

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required in production')
  }

  if (!isStrongSecret(process.env.JWT_SECRET)) {
    throw new Error(
      'JWT_SECRET must be a strong random string (32+ chars) in production'
    )
  }

  if (!isStrongSecret(process.env.IP_HASH_SECRET)) {
    throw new Error(
      'IP_HASH_SECRET must be a strong random string (32+ chars) in production'
    )
  }

  const origin = process.env.CLIENT_ORIGIN
  const allowLocalhost = process.env.ALLOW_LOCALHOST_CORS === 'true'
  const isLocalOrigin =
    !origin || origin.includes('localhost') || origin.includes('127.0.0.1')

  if (!origin || (!allowLocalhost && isLocalOrigin)) {
    throw new Error('CLIENT_ORIGIN must be set to your production frontend URL')
  }
}

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || DEV_JWT_SECRET
}