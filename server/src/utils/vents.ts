import { query } from '../db.js'
import { buildAvatarUrl } from './avatar-assets.js'
import { fetchCommentsForVent, mapCommentRow } from './comments.js'
import { resolveVentId } from './slug.js'
import { isOnWall } from './wall.js'
import { MAX_VENT_EDITS } from '../constants.js'

function mapVentUser(row: {
  user_id: string
  username: string
  status?: string | null
  avatar_path?: string | null
  avatar_updated_at?: string | null
}) {
  return {
    id: row.user_id,
    username: row.username,
    status: row.status ?? null,
    avatar_url: buildAvatarUrl(row.user_id, row.avatar_path, row.avatar_updated_at),
  }
}

function mapVentAsset(row: {
  asset_id: string | null
  asset_preview_url?: string | null
  asset_width?: number | null
  asset_height?: number | null
}) {
  if (!row.asset_id) return undefined

  return {
    id: row.asset_id,
    preview_url: row.asset_preview_url ?? null,
    width: row.asset_width ?? null,
    height: row.asset_height ?? null,
    url: `/api/media/assets/${row.asset_id}`,
  }
}

const VENT_SELECT_FIELDS = `
  v.id,
  v.slug,
  v.user_id,
  v.content,
  v.created_at,
  v.expires_at,
  v.asset_id,
  v.contribute_to_globe,
  COALESCE(v.edit_count, 0)::int AS edit_count,
  u.username,
  u.status,
  u.avatar_path,
  u.avatar_updated_at,
  ma.preview_url AS asset_preview_url,
  ma.width AS asset_width,
  ma.height AS asset_height,
  COALESCE(
    json_agg(DISTINCT jsonb_build_object(
      'id', mt.id,
      'name', mt.name,
      'color', mt.color,
      'emoji', mt.emoji
    )) FILTER (WHERE mt.id IS NOT NULL),
    '[]'
  ) AS mood_tags,
  COALESCE(
    json_agg(DISTINCT jsonb_build_object(
      'id', r.id,
      'emoji', r.emoji,
      'user_id', r.user_id,
      'created_at', r.created_at
    )) FILTER (WHERE r.id IS NOT NULL),
    '[]'
  ) AS reactions
`

const VENT_GROUP_BY = `
  v.id, v.slug, v.user_id, v.content, v.created_at, v.expires_at, v.asset_id, v.contribute_to_globe, v.edit_count,
  u.username, u.status, u.avatar_path, u.avatar_updated_at,
  ma.preview_url, ma.width, ma.height
`

export interface VentRow {
  id: string
  slug: string
  user_id: string
  content: string
  created_at: string
  expires_at: string
  contribute_to_globe?: boolean
  edit_count?: number
  username: string
  mood_tags: Array<{ id: string; name: string; color: string; emoji: string }>
  reactions: Array<{ id: string; emoji: string; user_id: string; created_at: string }>
}

function mapEditMeta(editCount: number | null | undefined) {
  const count = Math.max(0, Number(editCount) || 0)
  const remaining = Math.max(0, MAX_VENT_EDITS - count)
  return {
    edit_count: count,
    max_edits: MAX_VENT_EDITS,
    edits_remaining: remaining,
  }
}

export async function fetchVentsWithRelations(options: {
  userId?: string
  tagIds?: string[]
  sortBy?: string
  timeFilter?: string
  offset?: number
  limit?: number
  includeExpired?: boolean
  /** Partial match on username (case-insensitive). */
  username?: string
  /** Partial match on vent content (case-insensitive). */
  query?: string
  minReactions?: number
}): Promise<VentRow[]> {
  const {
    userId,
    tagIds = [],
    sortBy = 'newest',
    timeFilter = 'all',
    offset = 0,
    limit = 20,
    includeExpired = false,
    username,
    query: contentQuery,
    minReactions = 0,
  } = options

  const conditions: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (!includeExpired) {
    conditions.push(`v.expires_at >= now()`)
  }

  if (userId) {
    conditions.push(`v.user_id = $${paramIndex++}`)
    params.push(userId)
  }

  if (timeFilter !== 'all') {
    const startDate = getTimeFilterDate(timeFilter)
    conditions.push(`v.created_at >= $${paramIndex++}`)
    params.push(startDate.toISOString())
  }

  if (tagIds.length > 0) {
    conditions.push(`
      EXISTS (
        SELECT 1 FROM vent_tags vt_filter
        WHERE vt_filter.vent_id = v.id
          AND vt_filter.tag_id = ANY($${paramIndex++}::text[])
      )
    `)
    params.push(tagIds)
  }

  const usernameTrim = username?.trim()
  if (usernameTrim) {
    const safe = usernameTrim.replace(/[%_\\]/g, '').slice(0, 30)
    if (safe) {
      conditions.push(`u.username ILIKE $${paramIndex++}`)
      params.push(`%${safe}%`)
    }
  }

  const contentTrim = contentQuery?.trim()
  if (contentTrim) {
    const safe = contentTrim.replace(/[%_\\]/g, '').slice(0, 200)
    if (safe) {
      conditions.push(`v.content ILIKE $${paramIndex++}`)
      params.push(`%${safe}%`)
    }
  }

  if (minReactions > 0) {
    conditions.push(`
      (SELECT COUNT(*)::int FROM reactions r_min WHERE r_min.vent_id = v.id) >= $${paramIndex++}
    `)
    params.push(minReactions)
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  let orderClause = 'ORDER BY v.created_at DESC'
  if (sortBy === 'oldest') {
    orderClause = 'ORDER BY v.created_at ASC'
  }

  params.push(limit, offset)

  const result = await query<{
    id: string
    slug: string
    user_id: string
    content: string
    created_at: string
    expires_at: string
    asset_id: string | null
    asset_preview_url: string | null
    asset_width: number | null
    asset_height: number | null
    username: string
    status: string | null
    avatar_path: string | null
    avatar_updated_at: string | null
    mood_tags: VentRow['mood_tags']
    reactions: VentRow['reactions']
  }>(
    `
    SELECT
      ${VENT_SELECT_FIELDS}
    FROM vents v
    JOIN users u ON u.id = v.user_id
    LEFT JOIN media_assets ma ON ma.id = v.asset_id
    LEFT JOIN vent_tags vt ON vt.vent_id = v.id
    LEFT JOIN mood_tags mt ON mt.id = vt.tag_id
    LEFT JOIN reactions r ON r.vent_id = v.id
    ${whereClause}
    GROUP BY ${VENT_GROUP_BY}
    ${orderClause}
    LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `,
    params
  )

  let vents = result.rows.map((row) => {
    const editMeta = mapEditMeta((row as { edit_count?: number }).edit_count)
    return {
      id: row.id,
      slug: row.slug,
      user_id: row.user_id,
      content: row.content,
      created_at: row.created_at,
      expires_at: row.expires_at,
      contribute_to_globe: Boolean(
        (row as { contribute_to_globe?: boolean }).contribute_to_globe ?? true
      ),
      ...editMeta,
      is_on_wall: isOnWall(row.expires_at),
      user: mapVentUser(row),
      asset: mapVentAsset(row),
      mood_tags: row.mood_tags ?? [],
      reactions: row.reactions ?? [],
    }
  })

  if (sortBy === 'most_reactions') {
    vents = vents.sort((a, b) => (b.reactions?.length || 0) - (a.reactions?.length || 0))
  } else if (sortBy === 'trending') {
    const now = Date.now()
    vents = vents.sort((a, b) => {
      const aAge = now - new Date(a.created_at).getTime()
      const bAge = now - new Date(b.created_at).getTime()
      const aScore = (a.reactions?.length || 0) / (aAge / 3_600_000 + 1)
      const bScore = (b.reactions?.length || 0) / (bAge / 3_600_000 + 1)
      return bScore - aScore
    })
  }

  return vents as unknown as VentRow[]
}

export async function fetchVentByIdentifier(identifier: string) {
  const ventId = await resolveVentId(identifier)
  if (!ventId) return null

  return fetchVentById(ventId)
}

export async function fetchVentById(ventId: string) {
  const result = await query<{
    id: string
    slug: string
    user_id: string
    content: string
    created_at: string
    expires_at: string
    asset_id: string | null
    contribute_to_globe: boolean
    edit_count: number
    asset_preview_url: string | null
    asset_width: number | null
    asset_height: number | null
    username: string
    status: string | null
    avatar_path: string | null
    avatar_updated_at: string | null
    mood_tags: VentRow['mood_tags']
    reactions: VentRow['reactions']
  }>(
    `
    SELECT
      ${VENT_SELECT_FIELDS}
    FROM vents v
    JOIN users u ON u.id = v.user_id
    LEFT JOIN media_assets ma ON ma.id = v.asset_id
    LEFT JOIN vent_tags vt ON vt.vent_id = v.id
    LEFT JOIN mood_tags mt ON mt.id = vt.tag_id
    LEFT JOIN reactions r ON r.vent_id = v.id
    WHERE v.id = $1
    GROUP BY ${VENT_GROUP_BY}
    `,
    [ventId]
  )

  const row = result.rows[0]
  if (!row) return null

  const onWall = isOnWall(row.expires_at)
  const comments = onWall ? await fetchCommentsForVent(ventId) : []
  const editMeta = mapEditMeta(row.edit_count)

  return {
    id: row.id,
    slug: row.slug,
    user_id: row.user_id,
    content: row.content,
    created_at: row.created_at,
    expires_at: row.expires_at,
    contribute_to_globe: Boolean(row.contribute_to_globe),
    ...editMeta,
    is_on_wall: onWall,
    user: mapVentUser(row),
    asset: mapVentAsset(row),
    mood_tags: row.mood_tags ?? [],
    reactions: row.reactions ?? [],
    comments: comments.map(mapCommentRow),
    comments_open: onWall,
  }
}

function getTimeFilterDate(timeFilter: string): Date {
  const now = new Date()
  switch (timeFilter) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1)
    default:
      return new Date(0)
  }
}