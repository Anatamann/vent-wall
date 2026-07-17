import { getClientIp } from './ip.js'
import type { Request } from 'express'

/** Approximate ISP location stored on vents. Never includes raw IP. */
export interface VentLocation {
  countryCode: string | null
  country: string | null
  state: string | null
  city: string | null
  lat: number | null
  lng: number | null
}

const GEO_TIMEOUT_MS = 2500
const COORD_DECIMALS = 2 // ~1.1 km precision — not exact position

function isPrivateOrLocalIp(ip: string): boolean {
  const normalized = ip.replace(/^::ffff:/, '').toLowerCase()
  if (
    normalized === 'unknown' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === 'localhost' ||
    normalized === '0.0.0.0'
  ) {
    return true
  }
  if (normalized.startsWith('10.')) return true
  if (normalized.startsWith('192.168.')) return true
  if (normalized.startsWith('169.254.')) return true
  const parts = normalized.split('.').map(Number)
  if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true
  }
  return false
}

function roundCoord(value: number): number {
  const factor = 10 ** COORD_DECIMALS
  return Math.round(value * factor) / factor
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed === '-') return null
  return trimmed
}

function emptyLocation(): VentLocation {
  return {
    countryCode: null,
    country: null,
    state: null,
    city: null,
    lat: null,
    lng: null,
  }
}

function locationFromEnvFallback(): VentLocation | null {
  const lat = Number(process.env.DEV_GEO_LAT)
  const lng = Number(process.env.DEV_GEO_LNG)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return {
    countryCode: (process.env.DEV_GEO_COUNTRY_CODE || 'US').toUpperCase(),
    country: process.env.DEV_GEO_COUNTRY || 'United States',
    state: process.env.DEV_GEO_STATE || null,
    city: process.env.DEV_GEO_CITY || null,
    lat: roundCoord(lat),
    lng: roundCoord(lng),
  }
}

function parseGeoJson(data: Record<string, unknown>): VentLocation {
  if (data.error) return emptyLocation()

  const latRaw = typeof data.latitude === 'number' ? data.latitude : Number(data.latitude)
  const lngRaw = typeof data.longitude === 'number' ? data.longitude : Number(data.longitude)
  const lat = Number.isFinite(latRaw) ? roundCoord(latRaw) : null
  const lng = Number.isFinite(lngRaw) ? roundCoord(lngRaw) : null

  return {
    countryCode: cleanText(data.country_code)?.toUpperCase() ?? null,
    country: cleanText(data.country_name) ?? cleanText(data.country),
    state: cleanText(data.region) ?? cleanText(data.region_code),
    city: cleanText(data.city),
    lat,
    lng,
  }
}

async function fetchGeoUrl(url: string): Promise<VentLocation> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'vent-wall/1.0' },
    })
    if (!response.ok) return emptyLocation()
    const data = (await response.json()) as Record<string, unknown>
    return parseGeoJson(data)
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Resolve approximate ISP location from request IP.
 * Fail-open: returns null fields on any error so post creation never breaks.
 * Raw IP is not returned or persisted.
 *
 * Localhost / private IPs cannot be geolocated from the TCP peer address. In
 * development we fall back to DEV_GEO_* env, then a public-egress IP lookup so
 * Support Globe markers still appear when testing on 127.0.0.1.
 */
export async function resolveLocationFromRequest(req: Request): Promise<VentLocation> {
  try {
    const ip = getClientIp(req)
    const base = (process.env.IP_GEO_API_URL || 'https://ipapi.co').replace(/\/$/, '')

    if (!ip || isPrivateOrLocalIp(ip)) {
      const fromEnv = locationFromEnvFallback()
      if (fromEnv?.lat != null && fromEnv?.lng != null) {
        return fromEnv
      }

      // Dev / explicit opt-in: geolocate the machine's public egress IP.
      const allowPublicFallback =
        process.env.NODE_ENV !== 'production' ||
        process.env.GEO_FALLBACK_PUBLIC_ON_PRIVATE === 'true'
      if (allowPublicFallback) {
        const publicGeo = await fetchGeoUrl(`${base}/json/`)
        if (publicGeo.lat != null && publicGeo.lng != null) {
          return publicGeo
        }
      }

      return emptyLocation()
    }

    return await fetchGeoUrl(`${base}/${encodeURIComponent(ip)}/json/`)
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Geolocation lookup failed (non-fatal):', err instanceof Error ? err.message : err)
    }
    return emptyLocation()
  }
}

/** Stable region key: COUNTRY:State or COUNTRY:_country for country-only. */
export function buildRegionKey(countryCode: string | null, state: string | null): string | null {
  if (!countryCode) return null
  const code = countryCode.toUpperCase()
  const region = state?.trim()
  if (region) return `${code}:${region}`
  return `${code}:_country`
}

export function parseRegionKey(regionKey: string): { countryCode: string; state: string | null } | null {
  const idx = regionKey.indexOf(':')
  if (idx <= 0) return null
  const countryCode = regionKey.slice(0, idx).toUpperCase()
  const rest = regionKey.slice(idx + 1)
  if (!countryCode) return null
  if (!rest || rest === '_country') {
    return { countryCode, state: null }
  }
  return { countryCode, state: rest }
}
