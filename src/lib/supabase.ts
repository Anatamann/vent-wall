import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id: string
  username: string
  created_at: string
  last_post_date: string
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
  user?: User
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
  user?: User
}