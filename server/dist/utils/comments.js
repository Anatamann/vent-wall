import { query } from '../db.js';
import { isOnWall } from './wall.js';
const EMOJI_ONLY_REGEX = /^(?:\p{Extended_Pictographic}|\uFE0F|\u200D)+$/u;
const KLIPY_GIF_ID_REGEX = /^[0-9]{1,20}$/;
export function parseCommentInput(body) {
    const type = String(body.type || '').trim();
    if (type === 'gif' || body.gif_id) {
        const gifId = String(body.gif_id || '').trim();
        if (!gifId)
            return null;
        return { type: 'gif', gif_id: gifId };
    }
    const emoji = String(body.emoji || '').trim();
    if (!emoji && !type)
        return null;
    return { type: 'emoji', emoji };
}
export function validateGifComment(gifId) {
    const trimmed = gifId.trim();
    if (!trimmed) {
        return { valid: false, error: 'GIF id is required' };
    }
    if (!KLIPY_GIF_ID_REGEX.test(trimmed)) {
        return { valid: false, error: 'Invalid GIF id' };
    }
    return { valid: true };
}
export function validateEmojiComment(emoji) {
    const trimmed = emoji.trim();
    if (!trimmed) {
        return { valid: false, error: 'Emoji is required' };
    }
    if (trimmed.length > 32) {
        return { valid: false, error: 'Emoji is too long' };
    }
    if (!EMOJI_ONLY_REGEX.test(trimmed)) {
        return { valid: false, error: 'Only emoji comments are allowed' };
    }
    return { valid: true };
}
export function mapCommentRow(row) {
    return {
        id: row.id,
        vent_id: row.vent_id,
        user_id: row.user_id,
        comment_type: row.comment_type,
        emoji: row.emoji,
        created_at: row.created_at,
        user: { id: row.user_id, username: row.username, status: row.status ?? null },
        asset: row.comment_type === 'gif' && row.asset_id
            ? {
                id: row.asset_id,
                preview_url: row.asset_preview_url,
                width: row.asset_width,
                height: row.asset_height,
                url: `/api/media/assets/${row.asset_id}`,
            }
            : undefined,
    };
}
export async function fetchCommentsForVent(ventId) {
    const result = await query(`
    SELECT
      c.id,
      c.vent_id,
      c.user_id,
      c.comment_type,
      c.emoji,
      c.asset_id,
      c.created_at,
      u.username,
      u.status,
      a.preview_url AS asset_preview_url,
      a.width AS asset_width,
      a.height AS asset_height
    FROM vent_comments c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN media_assets a ON a.id = c.asset_id
    WHERE c.vent_id = $1
    ORDER BY c.created_at ASC
    `, [ventId]);
    return result.rows;
}
export async function ventAcceptsComments(ventId) {
    const result = await query('SELECT expires_at FROM vents WHERE id = $1', [ventId]);
    const vent = result.rows[0];
    if (!vent) {
        return { accepts: false };
    }
    return {
        accepts: isOnWall(vent.expires_at),
        expires_at: vent.expires_at,
    };
}
