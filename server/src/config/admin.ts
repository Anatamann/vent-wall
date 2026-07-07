const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

let cachedAdminIds: Set<string> | null = null

function parseAdminUserIds(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS || ''
  const ids = raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => UUID_REGEX.test(part))

  return new Set(ids)
}

export function getAdminUserIds(): Set<string> {
  if (!cachedAdminIds) {
    cachedAdminIds = parseAdminUserIds()
  }
  return cachedAdminIds
}

export function isAdminUser(userId: string): boolean {
  return getAdminUserIds().has(userId)
}