import { query } from '../db.js'
import {
  MIN_VENTS_FOR_DOMINATING,
  resolveDominatingEmotion,
  type MoodTagCount,
} from './dominating-emotion.js'
import { buildRegionKey, parseRegionKey } from './geolocation.js'
import {
  STATE_CENTERS,
  resolveRegionCenter,
} from '../data/state-centers.js'
import { buildAvatarUrl } from './avatar-assets.js'

export interface GlobeRegionPoint {
  regionKey: string
  state: string | null
  country: string | null
  countryCode: string | null
  lat: number
  lng: number
  dominatingEmoticon: string
  dominatingTagName: string | null
  dominatingTagId: string | null
  dominatingTagColor: string | null
  totalVents: number
  totalEngagement: number
  isReliable: boolean
  isEmpty: boolean
}

export interface GlobeVentSummary {
  id: string
  slug: string
  content: string
  created_at: string
  user: {
    id: string
    username: string
    status: string | null
    avatar_url: string | null
  }
  mood_tags: Array<{ id: string; name: string; color: string; emoji: string }>
  engagement_count: number
  reaction_count: number
  comment_count: number
}

type GlobeVentRow = {
  id: string
  slug: string
  content: string
  created_at: string
  user_id: string
  username: string
  status: string | null
  avatar_path: string | null
  avatar_updated_at: string | null
  mood_tags: Array<{ id: string; name: string; color: string; emoji: string }>
  reaction_count: number
  comment_count: number
  country?: string | null
  state?: string | null
}

function mapGlobeVentRow(row: GlobeVentRow): GlobeVentSummary {
  return {
    id: row.id,
    slug: row.slug,
    content: row.content,
    created_at: row.created_at,
    user: {
      id: row.user_id,
      username: row.username || 'Anonymous',
      status: row.status ?? null,
      avatar_url: buildAvatarUrl(row.user_id, row.avatar_path, row.avatar_updated_at),
    },
    mood_tags: Array.isArray(row.mood_tags) ? row.mood_tags : [],
    reaction_count: row.reaction_count,
    comment_count: row.comment_count,
    engagement_count: row.reaction_count + row.comment_count,
  }
}

const GLOBE_VENT_SELECT = `
  v.id,
  v.slug,
  COALESCE(v.content, '') AS content,
  v.created_at,
  v.user_id,
  u.username,
  u.status,
  u.avatar_path,
  u.avatar_updated_at,
  COALESCE(
    (
      SELECT json_agg(jsonb_build_object(
        'id', mt.id,
        'name', mt.name,
        'color', mt.color,
        'emoji', mt.emoji
      ) ORDER BY mt.name)
      FROM vent_tags vt
      INNER JOIN mood_tags mt ON mt.id = vt.tag_id
      WHERE vt.vent_id = v.id
    ),
    '[]'::json
  ) AS mood_tags,
  (SELECT COUNT(*)::int FROM reactions r WHERE r.vent_id = v.id) AS reaction_count,
  (SELECT COUNT(*)::int FROM vent_comments c WHERE c.vent_id = v.id) AS comment_count
`

function clampHours(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 24
  return Math.min(Math.max(Math.floor(n), 1), 168)
}

export function parseHoursParam(raw: unknown): number {
  return clampHours(raw)
}

interface RegionAggRow {
  country_code: string | null
  country: string | null
  state: string | null
  avg_lat: number | null
  avg_lng: number | null
  total_vents: number
  reaction_count: number
  comment_count: number
}

interface TagAggRow {
  country_code: string | null
  state: string | null
  tag_id: string
  tag_name: string
  tag_emoji: string
  tag_color: string
  tag_count: number
}

function emptyEmoticonForKey(regionKey: string): string {
  // Stable pseudo-random per region so empties don't flicker across refreshes
  let hash = 0
  for (let i = 0; i < regionKey.length; i++) {
    hash = (hash * 31 + regionKey.charCodeAt(i)) >>> 0
  }
  return hash % 2 === 0 ? '☁️' : '🦆'
}

export async function fetchGlobeRegions(hours: number): Promise<GlobeRegionPoint[]> {
  const regionRows = await query<RegionAggRow>(
    `WITH globe_vents AS (
       SELECT id, location_country_code, location_country, location_state,
              location_lat, location_lng
       FROM vents
       WHERE contribute_to_globe = true
         AND created_at > now() - make_interval(hours => $1)
         AND location_lat IS NOT NULL
         AND location_lng IS NOT NULL
         AND location_country_code IS NOT NULL
     )
     SELECT
       gv.location_country_code AS country_code,
       MAX(gv.location_country) AS country,
       gv.location_state AS state,
       AVG(gv.location_lat)::float8 AS avg_lat,
       AVG(gv.location_lng)::float8 AS avg_lng,
       COUNT(*)::int AS total_vents,
       COALESCE((
         SELECT COUNT(*)::int
         FROM reactions r
         WHERE r.vent_id IN (SELECT id FROM globe_vents gv2
           WHERE gv2.location_country_code IS NOT DISTINCT FROM gv.location_country_code
             AND gv2.location_state IS NOT DISTINCT FROM gv.location_state)
       ), 0) AS reaction_count,
       COALESCE((
         SELECT COUNT(*)::int
         FROM vent_comments c
         WHERE c.vent_id IN (SELECT id FROM globe_vents gv3
           WHERE gv3.location_country_code IS NOT DISTINCT FROM gv.location_country_code
             AND gv3.location_state IS NOT DISTINCT FROM gv.location_state)
       ), 0) AS comment_count
     FROM globe_vents gv
     GROUP BY gv.location_country_code, gv.location_state`,
    [hours]
  )

  const tagRows = await query<TagAggRow>(
    `SELECT
       v.location_country_code AS country_code,
       v.location_state AS state,
       mt.id AS tag_id,
       mt.name AS tag_name,
       mt.emoji AS tag_emoji,
       mt.color AS tag_color,
       COUNT(*)::int AS tag_count
     FROM vents v
     INNER JOIN vent_tags vt ON vt.vent_id = v.id
     INNER JOIN mood_tags mt ON mt.id = vt.tag_id
     WHERE v.contribute_to_globe = true
       AND v.created_at > now() - make_interval(hours => $1)
       AND v.location_lat IS NOT NULL
       AND v.location_lng IS NOT NULL
       AND v.location_country_code IS NOT NULL
     GROUP BY v.location_country_code, v.location_state, mt.id, mt.name, mt.emoji, mt.color`,
    [hours]
  )

  const tagsByRegion = new Map<string, MoodTagCount[]>()
  for (const row of tagRows.rows) {
    const key = buildRegionKey(row.country_code, row.state)
    if (!key) continue
    const list = tagsByRegion.get(key) || []
    list.push({
      id: row.tag_id,
      name: row.tag_name,
      emoji: row.tag_emoji,
      color: row.tag_color,
      count: row.tag_count,
    })
    tagsByRegion.set(key, list)
  }

  const activeKeys = new Set<string>()
  const points: GlobeRegionPoint[] = []

  for (const row of regionRows.rows) {
    const regionKey = buildRegionKey(row.country_code, row.state)
    if (!regionKey) continue

    const center = resolveRegionCenter({
      countryCode: row.country_code,
      state: row.state,
      avgLat: row.avg_lat,
      avgLng: row.avg_lng,
    })
    if (!center) continue

    const dominating = resolveDominatingEmotion(
      tagsByRegion.get(regionKey) || [],
      row.total_vents
    )

    activeKeys.add(regionKey)
    points.push({
      regionKey,
      state: row.state,
      country: row.country,
      countryCode: row.country_code,
      lat: center.lat,
      lng: center.lng,
      dominatingEmoticon: dominating?.tag.emoji || emptyEmoticonForKey(regionKey),
      dominatingTagName: dominating?.tag.name ?? null,
      dominatingTagId: dominating?.tag.id ?? null,
      dominatingTagColor: dominating?.tag.color ?? null,
      totalVents: row.total_vents,
      totalEngagement: row.reaction_count + row.comment_count,
      isReliable: dominating?.isReliable ?? row.total_vents >= MIN_VENTS_FOR_DOMINATING,
      isEmpty: false,
    })
  }

  // Empty known state/province regions get stable cloud/duck markers (not every country).
  for (const [regionKey, center] of Object.entries(STATE_CENTERS)) {
    if (activeKeys.has(regionKey)) continue
    const parsed = parseRegionKey(regionKey)
    points.push({
      regionKey,
      state: parsed?.state ?? center.label,
      country: null,
      countryCode: parsed?.countryCode ?? null,
      lat: center.lat,
      lng: center.lng,
      dominatingEmoticon: emptyEmoticonForKey(regionKey),
      dominatingTagName: null,
      dominatingTagId: null,
      dominatingTagColor: null,
      totalVents: 0,
      totalEngagement: 0,
      isReliable: false,
      isEmpty: true,
    })
  }

  return points
}

export async function fetchGlobeVentsForRegion(
  regionKey: string,
  hours: number,
  limit = 60
): Promise<{ regionKey: string; header: string; vents: GlobeVentSummary[] }> {
  const parsed = parseRegionKey(regionKey)
  if (!parsed) {
    return { regionKey, header: regionKey, vents: [] }
  }

  const result = await query<GlobeVentRow & { country: string | null; state: string | null }>(
    `SELECT
       ${GLOBE_VENT_SELECT},
       v.location_country AS country,
       v.location_state AS state
     FROM vents v
     INNER JOIN users u ON u.id = v.user_id
     WHERE v.contribute_to_globe = true
       AND v.created_at > now() - make_interval(hours => $1)
       AND v.location_lat IS NOT NULL
       AND v.location_lng IS NOT NULL
       AND v.location_country_code = $2
       AND (
         ($3::text IS NULL AND v.location_state IS NULL)
         OR v.location_state = $3
       )
     ORDER BY v.created_at DESC
     LIMIT $4`,
    [hours, parsed.countryCode, parsed.state, limit]
  )

  const vents = result.rows.map(mapGlobeVentRow)
  const sample = result.rows[0]
  const headerParts = [sample?.state, sample?.country].filter(Boolean)
  const header = headerParts.length > 0 ? headerParts.join(', ') : regionKey

  return { regionKey, header, vents }
}

export async function fetchGlobeVentsForMood(
  tagId: string,
  hours: number,
  limit = 60
): Promise<{
  tagId: string
  tagName: string | null
  tagEmoji: string | null
  tagColor: string | null
  vents: GlobeVentSummary[]
}> {
  const tagResult = await query<{ id: string; name: string; emoji: string; color: string }>(
    'SELECT id, name, emoji, color FROM mood_tags WHERE id = $1',
    [tagId]
  )
  const tag = tagResult.rows[0]
  if (!tag) {
    return { tagId, tagName: null, tagEmoji: null, tagColor: null, vents: [] }
  }

  // Mood filter is Wall-wide: include all on-Wall vents with this tag, even if they
  // lack location / contribute_to_globe (so seed data and opted-out vents still appear).
  const result = await query<GlobeVentRow>(
    `SELECT
       ${GLOBE_VENT_SELECT}
     FROM vents v
     INNER JOIN users u ON u.id = v.user_id
     INNER JOIN vent_tags vt ON vt.vent_id = v.id AND vt.tag_id = $2
     WHERE v.expires_at >= now()
       AND v.created_at > now() - make_interval(hours => $1)
     ORDER BY v.created_at DESC
     LIMIT $3`,
    [hours, tagId, limit]
  )

  const vents = result.rows.map(mapGlobeVentRow)

  return {
    tagId,
    tagName: tag.name,
    tagEmoji: tag.emoji,
    tagColor: tag.color,
    vents,
  }
}
