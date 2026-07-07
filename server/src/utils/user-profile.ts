import { buildAvatarUrl } from './avatar-assets.js'

export interface UserRow {
  id: string
  username: string
  email?: string
  created_at: string
  last_post_date: string | null
  post_count_today: number
  avatar_path?: string | null
  avatar_mime_type?: string | null
  avatar_updated_at?: string | null
  status?: string | null
  is_admin?: boolean
}

export function enrichUser(user: UserRow) {
  const { avatar_path, avatar_mime_type, avatar_updated_at, ...rest } = user
  return {
    ...rest,
    avatar_url: buildAvatarUrl(user.id, avatar_path, avatar_updated_at),
    avatar_mime_type: avatar_path ? avatar_mime_type ?? null : null,
  }
}

export const USER_PUBLIC_FIELDS = `
  id, username, email, created_at, last_post_date, post_count_today,
  avatar_path, avatar_mime_type, avatar_updated_at, status
`