export interface User {
  id: string
  username: string
  email?: string
  created_at: string
  last_post_date: string | null
  post_count_today: number
}

export interface MoodTag {
  id: string
  name: string
  color: string
  emoji: string
  created_at: string
}

export interface Vent {
  id: string
  user_id: string
  content: string
  created_at: string
  expires_at: string
  user?: Pick<User, 'id' | 'username'>
  mood_tags?: MoodTag[]
  reactions?: Reaction[]
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
  user?: Pick<User, 'id' | 'username'>
}

export interface AuthUser {
  id: string
  username: string
  email?: string
}