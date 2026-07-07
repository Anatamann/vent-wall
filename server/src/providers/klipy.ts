import { KLIPY_SEARCH_MAX_QUERY_LENGTH } from '../constants.js'

const KLIPY_BASE = 'https://api.klipy.com/api/v1'

export interface KlipyGifItem {
  id: string
  slug: string
  title: string
  previewUrl: string
  gifUrl: string
  width: number
  height: number
}

export interface KlipySearchResponse {
  items: KlipyGifItem[]
  page: number
  perPage: number
  hasNext: boolean
}

type MediaFile = {
  url: string
  width: number
  height: number
}

const GIF_SIZE_ORDER = ['sm', 'md', 'xs', 'hd'] as const
const PREVIEW_SIZE_ORDER = ['xs', 'sm', 'md', 'hd'] as const

function getApiKey(): string {
  const key = process.env.KLIPY_API_KEY
  if (!key || key === 'paste-your-klipy-api-key-here') {
    throw new Error('KLIPY_API_KEY is not configured')
  }
  return key
}

function readMediaFile(entry: unknown): MediaFile | null {
  if (!entry || typeof entry !== 'object') return null
  const file = entry as Record<string, unknown>
  const url = typeof file.url === 'string' ? file.url : null
  if (!url) return null
  return {
    url,
    width: Number(file.width) || 0,
    height: Number(file.height) || 0,
  }
}

function pickFromKlipyFile(fileRoot: Record<string, unknown>): {
  gifUrl: string
  previewUrl: string
  width: number
  height: number
} | null {
  let gif: MediaFile | null = null
  let preview: MediaFile | null = null

  for (const size of GIF_SIZE_ORDER) {
    const sizeEntry = fileRoot[size]
    if (!sizeEntry || typeof sizeEntry !== 'object') continue
    const formats = sizeEntry as Record<string, unknown>
    if (!gif) {
      gif = readMediaFile(formats.gif) ?? readMediaFile(formats.mp4)
    }
  }

  for (const size of PREVIEW_SIZE_ORDER) {
    const sizeEntry = fileRoot[size]
    if (!sizeEntry || typeof sizeEntry !== 'object') continue
    const formats = sizeEntry as Record<string, unknown>
    if (!preview) {
      preview =
        readMediaFile(formats.webp) ??
        readMediaFile(formats.jpg) ??
        readMediaFile(formats.gif)
    }
  }

  if (!gif) return null

  return {
    gifUrl: gif.url,
    previewUrl: preview?.url ?? gif.url,
    width: gif.width,
    height: gif.height,
  }
}

function pickFromLegacyFiles(files: Record<string, unknown>): {
  gifUrl: string
  previewUrl: string
  width: number
  height: number
} | null {
  let gif: MediaFile | null = null
  let preview: MediaFile | null = null

  for (const key of ['gif', 'mediumgif', 'tinygif', 'nanogif', 'webp', 'mp4']) {
    const media = readMediaFile(files[key])
    if (!media) continue
    if (!gif && ['gif', 'mediumgif', 'mp4'].includes(key)) gif = media
    if (!preview && ['tinygif', 'nanogif', 'webp', 'gif'].includes(key)) preview = media
  }

  if (!gif) gif = readMediaFile(files.gif)
  if (!gif) return null

  return {
    gifUrl: gif.url,
    previewUrl: preview?.url ?? gif.url,
    width: gif.width,
    height: gif.height,
  }
}

function mapGifItem(raw: Record<string, unknown>): KlipyGifItem | null {
  const itemType = String(raw.type ?? 'gif').toLowerCase()
  if (itemType !== 'gif') return null

  const id = String(raw.id ?? '')
  if (!id) return null

  const fileRoot = raw.file as Record<string, unknown> | undefined
  const legacyFiles = raw.files as Record<string, unknown> | undefined

  const media = fileRoot
    ? pickFromKlipyFile(fileRoot)
    : legacyFiles
      ? pickFromLegacyFiles(legacyFiles)
      : null

  if (!media) return null

  const blurPreview =
    typeof raw.blur_preview === 'string' && raw.blur_preview.length > 0
      ? raw.blur_preview
      : null

  return {
    id,
    slug: String(raw.slug ?? id),
    title: String(raw.title ?? raw.content_description ?? ''),
    previewUrl: media.previewUrl ?? blurPreview ?? media.gifUrl,
    gifUrl: media.gifUrl,
    width: media.width,
    height: media.height,
  }
}

function extractGifList(payload: Record<string, unknown>): Record<string, unknown>[] {
  if (Array.isArray(payload.data)) {
    return payload.data as Record<string, unknown>[]
  }
  if (Array.isArray(payload.results)) {
    return payload.results as Record<string, unknown>[]
  }
  if (Array.isArray(payload)) {
    return payload as Record<string, unknown>[]
  }
  return []
}

function parseListResponse(data: unknown): KlipySearchResponse {
  const root = data as Record<string, unknown>
  const payload = (root.data as Record<string, unknown> | undefined) ?? root
  const list = extractGifList(payload)

  const items = list
    .map((item) => mapGifItem(item))
    .filter((item): item is KlipyGifItem => item !== null)

  return {
    items,
    page: Number(payload.current_page ?? payload.page ?? 1),
    perPage: Number(payload.per_page ?? items.length),
    hasNext: Boolean(payload.has_next ?? payload.hasNext ?? false),
  }
}

function parseSingleResponse(data: unknown): KlipyGifItem | null {
  const root = data as Record<string, unknown>
  const payload = root.data

  if (!payload || typeof payload !== 'object') return null

  const record = payload as Record<string, unknown>

  if (Array.isArray(record.data) && record.data[0]) {
    return mapGifItem(record.data[0] as Record<string, unknown>)
  }

  if (record.id || record.file || record.files) {
    return mapGifItem(record)
  }

  return null
}

async function klipyFetch(path: string, params: Record<string, string>): Promise<unknown> {
  const apiKey = getApiKey()
  const search = new URLSearchParams(params)
  const query = search.toString()
  const url = query ? `${KLIPY_BASE}/${apiKey}${path}?${query}` : `${KLIPY_BASE}/${apiKey}${path}`

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Klipy API error (${response.status})`)
  }

  return response.json()
}

export async function searchKlipyGifs(options: {
  query?: string
  page?: number
  perPage?: number
}): Promise<KlipySearchResponse> {
  const params: Record<string, string> = {
    per_page: String(Math.max(8, options.perPage ?? 20)),
    page: String(options.page ?? 1),
    rating: 'g',
    locale: 'us_US',
  }

  if (options.query?.trim()) {
    params.q = options.query.trim().slice(0, KLIPY_SEARCH_MAX_QUERY_LENGTH)
    const data = await klipyFetch('/gifs/search', params)
    return parseListResponse(data)
  }

  const data = await klipyFetch('/gifs/trending', params)
  return parseListResponse(data)
}

export async function getKlipyGifById(externalId: string): Promise<KlipyGifItem | null> {
  try {
    const data = await klipyFetch(`/gifs/${encodeURIComponent(externalId)}`, {})
    return parseSingleResponse(data)
  } catch {
    return null
  }
}

export function isKlipyConfigured(): boolean {
  const key = process.env.KLIPY_API_KEY
  return Boolean(key && key !== 'paste-your-klipy-api-key-here')
}