const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const LOOSE_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value)
}

export function isLooseUuid(value: string): boolean {
  return LOOSE_UUID_REGEX.test(value)
}

export function parseUuidList(raw: string): string[] | null {
  if (!raw.trim()) return []

  const ids = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (ids.some((id) => !isUuid(id))) {
    return null
  }

  return ids
}