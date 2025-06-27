import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'
import type { User, Vent } from '../lib/supabase'

interface UserStats {
  totalVents: number
  totalReactions: number
  joinedDate: string
  lastActiveDate: string
  postsThisMonth: number
  averageReactionsPerVent: number
}

export function useUserProfile() {
  const { user, isAuthenticated } = useAuth()
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [userVents, setUserVents] = useState<Vent[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUserProfile = async () => {
    if (!user || !isAuthenticated) {
      console.log('useUserProfile: No user or not authenticated')
      setUserProfile(null)
      setUserVents([])
      setUserStats(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('Fetching profile for user:', user.id)
      }

      // First check if user exists in our database
      const { data: userCheck, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (userCheckError && userCheckError.code === 'PGRST116') {
        // User doesn't exist in our database, create them
        console.log('User not found in database, creating profile...')
        
        const { error: createError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            username: user.user_metadata?.username || `user_${user.id.slice(0, 8)}`,
            created_at: new Date().toISOString(),
            last_post_date: new Date().toISOString().split('T')[0],
            post_count_today: 0
          })

        if (createError) {
          console.error('Error creating user profile:', createError)
          throw new Error('Failed to create user profile')
        }
        
        console.log('User profile created successfully')
      } else if (userCheckError) {
        console.error('Error checking user existence:', userCheckError)
        throw userCheckError
      }

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError
        console.error('Profile fetch error:', profileError)
      
      if (!profile) {
        console.error('No profile data returned')
        throw new Error('Profile not found')
      }
      
      console.log('Profile loaded successfully:', profile)
      setUserProfile(profile)

      // Fetch user's vents (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: vents, error: ventsError } = await supabase
        .from('vents')
        .select(`
          *,
          mood_tags:vent_tags(
            mood_tags(id, name, color, emoji)
          ),
          reactions(id, emoji, user_id)
        `)
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })

      if (ventsError) throw ventsError

      // Transform vents data
      const transformedVents = vents?.map(vent => ({
        ...vent,
        mood_tags: vent.mood_tags?.map((vt: any) => vt.mood_tags).filter(Boolean) || []
      })) || []

      setUserVents(transformedVents)

      // Calculate user statistics
      const { data: allVents, error: allVentsError } = await supabase
        .from('vents')
        .select('id, created_at')
        .eq('user_id', user.id)

      if (allVentsError) throw allVentsError

      const { data: allReactions, error: reactionsError } = await supabase
        .from('reactions')
        .select('id')
        .in('vent_id', allVents?.map(v => v.id) || [])

      if (reactionsError) throw reactionsError

      // Calculate stats
      const totalVents = allVents?.length || 0
      const totalReactions = allReactions?.length || 0
      const averageReactionsPerVent = totalVents > 0 ? totalReactions / totalVents : 0

      // Posts this month
      const thisMonth = new Date()
      thisMonth.setDate(1)
      thisMonth.setHours(0, 0, 0, 0)
      
      const postsThisMonth = allVents?.filter(vent => 
        new Date(vent.created_at) >= thisMonth
      ).length || 0

      setUserStats({
        totalVents,
        totalReactions,
        joinedDate: profile.created_at,
        lastActiveDate: profile.last_post_date || profile.created_at || new Date().toISOString(),
        postsThisMonth,
        averageReactionsPerVent: Math.round(averageReactionsPerVent * 10) / 10
      })

    } catch (err: any) {
      console.error('Error fetching user profile:', err)
      setError(err.message || 'Failed to fetch user profile')
    } finally {
      setLoading(false)
    }
  }

  const updateUsername = async (newUsername: string) => {
    if (!user) throw new Error('Not authenticated')

    // Validate username
    if (newUsername.length < 3 || newUsername.length > 30) {
      throw new Error('Username must be between 3 and 30 characters')
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(newUsername)) {
      throw new Error('Username can only contain letters, numbers, underscores, and hyphens')
    }

    const { error } = await supabase
      .from('users')
      .update({ username: newUsername })
      .eq('id', user.id)

    if (error) throw error

    // Refresh profile
    await fetchUserProfile()
  }

  const deleteVent = async (ventId: string) => {
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('vents')
      .delete()
      .eq('id', ventId)
      .eq('user_id', user.id) // Ensure user owns the vent

    if (error) throw error

    // Refresh vents
    await fetchUserProfile()
  }

  useEffect(() => {
    fetchUserProfile()
  }, [user, isAuthenticated])

  return {
    userProfile,
    userVents,
    userStats,
    loading,
    error,
    updateUsername,
    deleteVent,
    refresh: fetchUserProfile
  }
}