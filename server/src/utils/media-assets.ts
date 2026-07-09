import { createReadStream } from 'fs'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import { query } from '../db.js'
import { createPublicId } from './ids.js'
import { getKlipyGifById, type KlipyGifItem } from '../providers/klipy.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const MEDIA_ROOT = path.resolve(__dirname, '../../media')
export const MEDIA_CACHE_DIR = path.join(MEDIA_ROOT, 'cache')
const MAX_REDIRECTS = 3

const ALLOWED_DOWNLOAD_HOSTS = [
  'static.klipy.com',
  'media.klipy.com',
  'media.tenor.com',
  'c.tenor.com',
]

export interface MediaAssetRow {
  id: string
  type: string
  source: string
  external_id: string | null
  preview_url: string | null
  file_path: string
  mime_type: string
  width: number | null
  height: number | null
  expires_at: string
  created_at: string
}

export async function ensureMediaDirs(): Promise<void> {
  await fs.mkdir(MEDIA_CACHE_DIR, { recursive: true })
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes('webp')) return '.webp'
  if (mimeType.includes('png')) return '.png'
  if (mimeType.includes('mp4')) return '.mp4'
  return '.gif'
}

export function isAllowedDownloadUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    return ALLOWED_DOWNLOAD_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    )
  } catch {
    return false
  }
}

async function secureDownload(remoteUrl: string): Promise<Response> {
  if (!isAllowedDownloadUrl(remoteUrl)) {
    throw new Error('GIF URL is not from an allowed provider')
  }

  let currentUrl = remoteUrl

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(currentUrl, { redirect: 'manual' })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) {
        throw new Error('Invalid redirect while downloading GIF')
      }

      const nextUrl = new URL(location, currentUrl).href
      if (!isAllowedDownloadUrl(nextUrl)) {
        throw new Error('Redirect target is not from an allowed provider')
      }

      currentUrl = nextUrl
      continue
    }

    if (!response.ok) {
      throw new Error('Failed to download GIF')
    }

    return response
  }

  throw new Error('Too many redirects while downloading GIF')
}

async function downloadToCache(remoteUrl: string, mimeType: string): Promise<string> {
  const response = await secureDownload(remoteUrl)

  const contentType = response.headers.get('content-type') || mimeType
  const ext = extensionForMime(contentType)
  const filename = `${randomUUID()}${ext}`
  const relativePath = path.join('cache', filename)
  const absolutePath = path.join(MEDIA_ROOT, relativePath)

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('GIF file is too large')
  }

  await fs.writeFile(absolutePath, buffer)
  return relativePath.replace(/\\/g, '/')
}

export async function fetchAllowedGifBuffer(
  remoteUrl: string,
  maxBytes: number
): Promise<Buffer> {
  if (!isAllowedDownloadUrl(remoteUrl)) {
    throw new Error('GIF URL is not from an allowed provider')
  }

  const response = await secureDownload(remoteUrl)
  const buffer = Buffer.from(await response.arrayBuffer())

  if (buffer.length > maxBytes) {
    throw new Error(`GIF file is too large (max ${Math.round(maxBytes / (1024 * 1024))}MB)`)
  }

  return buffer
}

export async function findKlipyCachedFilePath(
  externalId: string
): Promise<string | null> {
  const result = await query<Pick<MediaAssetRow, 'file_path'>>(
    `SELECT file_path FROM media_assets
     WHERE source = 'klipy' AND external_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [externalId]
  )

  const row = result.rows[0]
  if (!row?.file_path) return null

  try {
    await fs.access(resolveMediaAbsolutePath(row.file_path))
    return row.file_path
  } catch {
    return null
  }
}

export async function findReusableKlipyAsset(
  externalId: string
): Promise<MediaAssetRow | null> {
  const result = await query<MediaAssetRow>(
    `SELECT * FROM media_assets
     WHERE source = 'klipy' AND external_id = $1 AND expires_at > now()
     ORDER BY created_at DESC
     LIMIT 1`,
    [externalId]
  )
  return result.rows[0] ?? null
}

async function extendAssetExpiry(assetId: string, expiresAt: Date): Promise<MediaAssetRow> {
  const result = await query<MediaAssetRow>(
    `UPDATE media_assets
     SET expires_at = GREATEST(expires_at, $2)
     WHERE id = $1
     RETURNING *`,
    [assetId, expiresAt.toISOString()]
  )
  return result.rows[0]
}

export async function ingestKlipyGif(options: {
  externalId: string
  expiresAt: Date
  prefetched?: KlipyGifItem
}): Promise<MediaAssetRow> {
  await ensureMediaDirs()

  const existing = await findReusableKlipyAsset(options.externalId)
  if (existing) {
    return extendAssetExpiry(existing.id, options.expiresAt)
  }

  const klipyGif = options.prefetched ?? (await getKlipyGifById(options.externalId))
  if (!klipyGif) {
    throw new Error('GIF not found')
  }

  if (!isAllowedDownloadUrl(klipyGif.gifUrl)) {
    throw new Error('GIF URL is not from an allowed provider')
  }

  const filePath = await downloadToCache(klipyGif.gifUrl, 'image/gif')

  try {
    const assetId = await createPublicId('m', 'media_assets')
    const inserted = await query<MediaAssetRow>(
      `INSERT INTO media_assets (
         id, type, source, external_id, preview_url, file_path, mime_type, width, height, expires_at
       ) VALUES ($1, 'gif', 'klipy', $2, $3, $4, 'image/gif', $5, $6, $7)
       RETURNING *`,
      [
        assetId,
        klipyGif.id,
        klipyGif.previewUrl,
        filePath,
        klipyGif.width || null,
        klipyGif.height || null,
        options.expiresAt.toISOString(),
      ]
    )
    return inserted.rows[0]
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      err.code === '23505'
    ) {
      const duplicate = await findReusableKlipyAsset(options.externalId)
      if (duplicate) {
        return extendAssetExpiry(duplicate.id, options.expiresAt)
      }
    }
    throw err
  }
}

export async function getMediaAsset(assetId: string): Promise<MediaAssetRow | null> {
  const result = await query<MediaAssetRow>(
    'SELECT * FROM media_assets WHERE id = $1',
    [assetId]
  )
  return result.rows[0] ?? null
}

export function resolveMediaAbsolutePath(relativePath: string): string {
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '')
  const absolute = path.resolve(MEDIA_ROOT, normalized)
  if (!absolute.startsWith(MEDIA_ROOT)) {
    throw new Error('Invalid media path')
  }
  return absolute
}

export function openMediaReadStream(relativePath: string) {
  return createReadStream(resolveMediaAbsolutePath(relativePath))
}

export async function cleanupExpiredMediaAssets(): Promise<number> {
  const expired = await query<MediaAssetRow>(
    `SELECT * FROM media_assets WHERE expires_at < now()`
  )

  let removed = 0
  for (const asset of expired.rows) {
    try {
      const absolute = resolveMediaAbsolutePath(asset.file_path)
      await fs.unlink(absolute).catch(() => undefined)
    } catch {
      // ignore missing files
    }

    await query('DELETE FROM media_assets WHERE id = $1', [asset.id])
    removed++
  }

  return removed
}