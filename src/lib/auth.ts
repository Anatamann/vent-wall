import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export interface AuthUser extends User {
  username?: string
}

export const auth = {
  // Sign up with email and password
  async signUp(username: string, password: string, email: string) {
    // First check if username is already taken
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single()

    if (existingUser) {
      throw new Error('Username is already taken')
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username
        }
      }
    })
    
    if (error) throw error
    
    // Wait a moment for the trigger to create the user profile
    if (data.user) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    return data
  },

  // Sign in with username and password
  async signIn(username: string, password: string) {
    // First get the email associated with this username
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (userError || !userData) {
      throw new Error('Username not found')
    }

    // Get the email from auth.users table
    const { data: authData, error: authError } = await supabase
      .rpc('get_user_email_by_id', { user_id: userData.id })

    if (authError || !authData) {
      throw new Error('Unable to find account')
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: authData,
      password
    })
    
    if (error) throw error
    return data
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  },

  // Get current session
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  },

  // Check if user can post (rate limiting)
  async canUserPost(userId: string): Promise<boolean> {
    const { data: user, error } = await supabase
      .from('users')
      .select('post_count_today, last_post_date')
      .eq('id', userId)
      .single()

    if (error) throw error

    const today = new Date().toISOString().split('T')[0]
    const lastPostDate = user.last_post_date

    // If last post was not today, user can post
    if (lastPostDate !== today) {
      return true
    }

    // If last post was today, check if under limit
    return user.post_count_today < 3
  }
}