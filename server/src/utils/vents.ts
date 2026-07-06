import { query } from '../db.js'
import { isOnWall } from './wall.js'

export interface VentRow {
  id: string
  user_id: string
  content: string
  created_at: string
  expires_at: string
  username: string
  mood_tags: Array<{ id: string; name: string; color: string; emoji: string }>
  reactions: Array<{ id: string; emoji: string; user_id: string; created_at: string }>
}

export async function fetchVentsWithRelations(options: {
  userId?: string
  tagIds?: string[]
  sortBy?: string
  timeFilter?: string
  offset?: number
  limit?: number
  includeExpired?: boolean
}): Promise<VentRow[]> {
  const {
    userId,
    tagIds = [],
    sortBy = 'newest',
    timeFilter = 'all',
    offset = 0,
    limit = 20,
    includeExpired = false,
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
          AND vt_filter.tag_id = ANY($${paramIndex++}::uuid[])
      )
    `)
    params.push(tagIds)
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  let orderClause = 'ORDER BY v.created_at DESC'
  if (sortBy === 'oldest') {
    orderClause = 'ORDER BY v.created_at ASC'
  }

  params.push(limit, offset)

  const result = await query<{
    id: string
    user_id: string
    content: string
    created_at: string
    expires_at: string
    username: string
    mood_tags: VentRow['mood_tags']
    reactions: VentRow['reactions']
  }>(
    `
    SELECT
      v.id,
      v.user_id,
      v.content,
      v.created_at,
      v.expires_at,
      u.username,
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
    FROM vents v
    JOIN users u ON u.id = v.user_id
    LEFT JOIN vent_tags vt ON vt.vent_id = v.id
    LEFT JOIN mood_tags mt ON mt.id = vt.tag_id
    LEFT JOIN reactions r ON r.vent_id = v.id
    ${whereClause}
    GROUP BY v.id, u.username
    ${orderClause}
    LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `,
    params
  )

  let vents = result.rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    content: row.content,
    created_at: row.created_at,
    expires_at: row.expires_at,
    is_on_wall: isOnWall(row.expires_at),
    user: { id: row.user_id, username: row.username },
    mood_tags: row.mood_tags ?? [],
    reactions: row.reactions ?? [],
  }))

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

export async function fetchVentById(ventId: string) {
  const result = await query<{
    id: string
    user_id: string
    content: string
    created_at: string
    expires_at: string
    username: string
    mood_tags: VentRow['mood_tags']
    reactions: VentRow['reactions']
  }>(
    `
    SELECT
      v.id,
      v.user_id,
      v.content,
      v.created_at,
      v.expires_at,
      u.username,
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
    FROM vents v
    JOIN users u ON u.id = v.user_id
    LEFT JOIN vent_tags vt ON vt.vent_id = v.id
    LEFT JOIN mood_tags mt ON mt.id = vt.tag_id
    LEFT JOIN reactions r ON r.vent_id = v.id
    WHERE v.id = $1
    GROUP BY v.id, u.username
    `,
    [ventId]
  )

  const row = result.rows[0]
  if (!row) return null

  return {
    id: row.id,
    user_id: row.user_id,
    content: row.content,
    created_at: row.created_at,
    expires_at: row.expires_at,
    is_on_wall: isOnWall(row.expires_at),
    user: { id: row.user_id, username: row.username },
    mood_tags: row.mood_tags ?? [],
    reactions: row.reactions ?? [],
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