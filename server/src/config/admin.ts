import { isPublicId } from '../utils/ids.js'

let cachedAdminIds: Set<string> | null = null

function parseAdminUserIds(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS || ''
  const ids = raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => isPublicId(part))

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