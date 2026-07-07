export interface User {
  id: string
  username: string
  email?: string
  created_at: string
  last_post_date: string | null
  post_count_today: number
  is_admin?: boolean
  avatar_url?: string | null
  avatar_mime_type?: string | null
  status?: string | null
}

export interface MoodTag {
  id: string
  name: string
  color: string
  emoji: string
  created_at: string
}

export interface CommentAsset {
  id: string
  url: string
  preview_url?: string | null
  width?: number | null
  height?: number | null
}

export interface VentComment {
  id: string
  vent_id: string
  user_id: string
  comment_type: 'emoji' | 'gif'
  emoji: string | null
  created_at: string
  user?: Pick<User, 'id' | 'username' | 'status' | 'avatar_url'>
  asset?: CommentAsset
}

export interface KlipyGifItem {
  id: string
  slug: string
  title: string
  previewUrl: string
  gifUrl: string
  width: number
  height: number
}

export interface GifDisclaimer {
  provider: string
  ads_enabled: boolean
  disclaimer: string
  terms_url: string
  privacy_url: string
}

export type CommentPayload =
  | { type: 'emoji'; emoji: string }
  | { type: 'gif'; gif_id: string }

export interface CreateVentPayload {
  content?: string
  tag_ids: string[]
  gif_id?: string
}

export interface Vent {
  id: string
  slug: string
  user_id: string
  content: string
  created_at: string
  expires_at: string
  is_on_wall?: boolean
  comments_open?: boolean
  user?: Pick<User, 'id' | 'username' | 'status' | 'avatar_url'>
  asset?: CommentAsset
  mood_tags?: MoodTag[]
  reactions?: Reaction[]
  comments?: VentComment[]
}

export interface VentTag {
  vent_id: string
  tag_id: string
  created_at: string
}

export interface Reaction {
  id: string
  vent_id: string
  user_id: string
  emoji: string
  created_at: string
  user?: Pick<User, 'id' | 'username' | 'status' | 'avatar_url'>
}

export interface AuthUser {
  id: string
  username: string
  email?: string
  is_admin?: boolean
  avatar_url?: string | null
}

export type FeedbackStatus = 'new' | 'triaged' | 'planned' | 'closed'

export interface UserFeedback {
  id: string
  tag_request: string
  message: string
  status: FeedbackStatus
  admin_note?: string | null
  created_at: string
  username?: string
}

export interface AdminOverview {
  totals: {
    vents_today: number
    reactions_today: number
    comments_today: number
    gif_comments_today: number
    new_users_today: number
  }
  new_feedback_count: number
  top_tags: Array<{ name: string; emoji: string; color: string; count: number }>
  top_emojis: Array<{ emoji: string; count: number }>
}