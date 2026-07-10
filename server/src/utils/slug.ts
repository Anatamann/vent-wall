import crypto from 'crypto'
import { query } from '../db.js'
import { isPublicId } from './ids.js'

export const VENT_SLUG_LENGTH = 8
export const VENT_SLUG_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
export const VENT_SLUG_REGEX = /^[a-hjkmnp-z2-9]{8}$/

export function isVentSlug(value: string): boolean {
  return VENT_SLUG_REGEX.test(value)
}

export function generateVentSlug(): string {
  const bytes = crypto.randomBytes(VENT_SLUG_LENGTH)
  let slug = ''

  for (let i = 0; i < VENT_SLUG_LENGTH; i++) {
    slug += VENT_SLUG_ALPHABET[bytes[i] % VENT_SLUG_ALPHABET.length]
  }

  return slug
}

export async function isVentSlugTaken(slug: string): Promise<boolean> {
  const result = await query('SELECT id FROM vents WHERE slug = $1 LIMIT 1', [slug])
  return (result.rowCount ?? 0) > 0
}

export async function generateUniqueVentSlug(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const slug = generateVentSlug()
    if (!(await isVentSlugTaken(slug))) {
      return slug
    }
  }

  throw new Error('Failed to generate unique vent slug')
}

export async function resolveVentId(identifier: string): Promise<string | null> {
  // Slugs are 8 chars and match the public-id pattern (e.g. peace2am), so resolve
  // by slug before id to avoid treating feed links as non-existent vent ids.
  if (isVentSlug(identifier)) {
    const bySlug = await query<{ id: string }>(
      'SELECT id FROM vents WHERE slug = $1 LIMIT 1',
      [identifier]
    )
    if (bySlug.rows[0]?.id) {
      return bySlug.rows[0].id
    }
  }

  if (isPublicId(identifier)) {
    const byId = await query<{ id: string }>(
      'SELECT id FROM vents WHERE id = $1 LIMIT 1',
      [identifier]
    )
    return byId.rows[0]?.id ?? null
  }

  return null
}

export async function backfillMissingVentSlugs(): Promise<number> {
  const missing = await query<{ id: string }>(
    'SELECT id FROM vents WHERE slug IS NULL ORDER BY created_at'
  )

  let updated = 0
  for (const row of missing.rows) {
    const slug = await generateUniqueVentSlug()
    await query('UPDATE vents SET slug = $1 WHERE id = $2', [slug, row.id])
    updated++
  }

  return updated
}