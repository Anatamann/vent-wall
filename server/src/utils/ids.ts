import crypto from 'crypto'
import type { PoolClient } from 'pg'
import { query } from '../db.js'

export const PUBLIC_ID_REGEX = /^[a-z][a-z0-9]{2,11}$/

const SUFFIX_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

export function isPublicId(value: string): boolean {
  return PUBLIC_ID_REGEX.test(value)
}

export function parsePublicIdList(raw: string): string[] | null {
  if (!raw.trim()) return []

  const ids = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (ids.some((id) => !isPublicId(id))) {
    return null
  }

  return ids
}

function randomSuffix(length: number): string {
  const bytes = crypto.randomBytes(length)
  let out = ''

  for (let i = 0; i < length; i++) {
    out += SUFFIX_ALPHABET[bytes[i] % SUFFIX_ALPHABET.length]
  }

  return out
}

export async function createPublicId(
  prefix: string,
  table: string,
  client?: PoolClient
): Promise<string> {
  if (!/^[a-z]$/.test(prefix)) {
    throw new Error(`Invalid public id prefix: ${prefix}`)
  }

  const runQuery = client ? client.query.bind(client) : query

  for (let attempt = 0; attempt < 30; attempt++) {
    const suffixLen = attempt < 20 ? 7 : 10
    const id = prefix + randomSuffix(suffixLen)
    const result = await runQuery(`SELECT 1 AS ok FROM ${table} WHERE id = $1 LIMIT 1`, [id])

    if ((result.rowCount ?? 0) === 0) {
      return id
    }
  }

  throw new Error(`Failed to generate unique id for ${table}`)
}