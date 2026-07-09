import { query } from '../db.js';
import { buildAvatarUrl } from './avatar-assets.js';
import { fetchCommentsForVent, mapCommentRow } from './comments.js';
import { resolveVentId } from './slug.js';
import { isOnWall } from './wall.js';
function mapVentUser(row) {
    return {
        id: row.user_id,
        username: row.username,
        status: row.status ?? null,
        avatar_url: buildAvatarUrl(row.user_id, row.avatar_path, row.avatar_updated_at),
    };
}
function mapVentAsset(row) {
    if (!row.asset_id)
        return undefined;
    return {
        id: row.asset_id,
        preview_url: row.asset_preview_url ?? null,
        width: row.asset_width ?? null,
        height: row.asset_height ?? null,
        url: `/api/media/assets/${row.asset_id}`,
    };
}
const VENT_SELECT_FIELDS = `
  v.id,
  v.slug,
  v.user_id,
  v.content,
  v.created_at,
  v.expires_at,
  v.asset_id,
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
`;
const VENT_GROUP_BY = `
  v.id, v.slug, v.user_id, v.content, v.created_at, v.expires_at, v.asset_id,
  u.username, u.status, u.avatar_path, u.avatar_updated_at,
  ma.preview_url, ma.width, ma.height
`;
export async function fetchVentsWithRelations(options) {
    const { userId, tagIds = [], sortBy = 'newest', timeFilter = 'all', offset = 0, limit = 20, includeExpired = false, } = options;
    const conditions = [];
    const params = [];
    let paramIndex = 1;
    if (!includeExpired) {
        conditions.push(`v.expires_at >= now()`);
    }
    if (userId) {
        conditions.push(`v.user_id = $${paramIndex++}`);
        params.push(userId);
    }
    if (timeFilter !== 'all') {
        const startDate = getTimeFilterDate(timeFilter);
        conditions.push(`v.created_at >= $${paramIndex++}`);
        params.push(startDate.toISOString());
    }
    if (tagIds.length > 0) {
        conditions.push(`
      EXISTS (
        SELECT 1 FROM vent_tags vt_filter
        WHERE vt_filter.vent_id = v.id
          AND vt_filter.tag_id = ANY($${paramIndex++}::text[])
      )
    `);
        params.push(tagIds);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    let orderClause = 'ORDER BY v.created_at DESC';
    if (sortBy === 'oldest') {
        orderClause = 'ORDER BY v.created_at ASC';
    }
    params.push(limit, offset);
    const result = await query(`
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
    `, params);
    let vents = result.rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        user_id: row.user_id,
        content: row.content,
        created_at: row.created_at,
        expires_at: row.expires_at,
        is_on_wall: isOnWall(row.expires_at),
        user: mapVentUser(row),
        asset: mapVentAsset(row),
        mood_tags: row.mood_tags ?? [],
        reactions: row.reactions ?? [],
    }));
    if (sortBy === 'most_reactions') {
        vents = vents.sort((a, b) => (b.reactions?.length || 0) - (a.reactions?.length || 0));
    }
    else if (sortBy === 'trending') {
        const now = Date.now();
        vents = vents.sort((a, b) => {
            const aAge = now - new Date(a.created_at).getTime();
            const bAge = now - new Date(b.created_at).getTime();
            const aScore = (a.reactions?.length || 0) / (aAge / 3_600_000 + 1);
            const bScore = (b.reactions?.length || 0) / (bAge / 3_600_000 + 1);
            return bScore - aScore;
        });
    }
    return vents;
}
export async function fetchVentByIdentifier(identifier) {
    const ventId = await resolveVentId(identifier);
    if (!ventId)
        return null;
    return fetchVentById(ventId);
}
export async function fetchVentById(ventId) {
    const result = await query(`
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
    `, [ventId]);
    const row = result.rows[0];
    if (!row)
        return null;
    const onWall = isOnWall(row.expires_at);
    const comments = onWall ? await fetchCommentsForVent(ventId) : [];
    return {
        id: row.id,
        slug: row.slug,
        user_id: row.user_id,
        content: row.content,
        created_at: row.created_at,
        expires_at: row.expires_at,
        is_on_wall: onWall,
        user: mapVentUser(row),
        asset: mapVentAsset(row),
        mood_tags: row.mood_tags ?? [],
        reactions: row.reactions ?? [],
        comments: comments.map(mapCommentRow),
        comments_open: onWall,
    };
}
function getTimeFilterDate(timeFilter) {
    const now = new Date();
    switch (timeFilter) {
        case 'today':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate());
        case 'week':
            return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case 'month':
            return new Date(now.getFullYear(), now.getMonth(), 1);
        default:
            return new Date(0);
    }
}
