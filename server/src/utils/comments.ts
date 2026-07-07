import { query } from '../db.js'
import { isOnWall } from './wall.js'

const EMOJI_ONLY_REGEX = /^(?:\p{Extended_Pictographic}|\uFE0F|\u200D)+$/u

export interface CommentRow {
  id: string
  vent_id: string
  user_id: string
  emoji: string
  created_at: string
  username: string
}

export function validateEmojiComment(emoji: string): {
  valid: boolean
  error?: string
} {
  const trimmed = emoji.trim()
  if (!trimmed) {
    return { valid: false, error: 'Emoji is required' }
  }
  if (trimmed.length > 32) {
    return { valid: false, error: 'Emoji is too long' }
  }
  if (!EMOJI_ONLY_REGEX.test(trimmed)) {
    return { valid: false, error: 'Only emoji comments are allowed' }
  }
  return { valid: true }
}

export async function fetchCommentsForVent(ventId: string): Promise<CommentRow[]> {
  const result = await query<CommentRow>(
    `
    SELECT
      c.id,
      c.vent_id,
      c.user_id,
      c.emoji,
      c.created_at,
      u.username
    FROM vent_comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.vent_id = $1
    ORDER BY c.created_at ASC
    `,
    [ventId]
  )

  return result.rows
}

export async function ventAcceptsComments(
  ventId: string
): Promise<{ accepts: boolean; expires_at?: string }> {
  const result = await query<{ expires_at: string }>(
    'SELECT expires_at FROM vents WHERE id = $1',
    [ventId]
  )

  const vent = result.rows[0]
  if (!vent) {
    return { accepts: false }
  }

  return {
    accepts: isOnWall(vent.expires_at),
    expires_at: vent.expires_at,
  }
}