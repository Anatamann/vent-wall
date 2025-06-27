import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'

interface PostLimits {
  canPost: boolean
  postsToday: number
  maxPosts: number
  timeUntilReset: string | null
}

export function usePostLimits() {
  const { user, isAuthenticated } = useAuth()
  const [limits, setLimits] = useState<PostLimits>({
    canPost: false,
    postsToday: 0,
    maxPosts: 3,
    timeUntilReset: null
  })
  const [loading, setLoading] = useState(true)

  const checkLimits = async () => {
    if (!user || !isAuthenticated) {
      setLimits({
        canPost: false,
        postsToday: 0,
        maxPosts: 3,
        timeUntilReset: null
      })
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('post_count_today, last_post_date')
        .eq('id', user.id)
        .single()

      if (error) throw error

      const today = new Date().toISOString().split('T')[0]
      const lastPostDate = data.last_post_date
      const postsToday = lastPostDate === today ? data.post_count_today : 0
      const canPost = postsToday < 3

      // Calculate time until reset (midnight)
      let timeUntilReset = null
      if (!canPost) {
        const now = new Date()
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        
        const msUntilReset = tomorrow.getTime() - now.getTime()
        const hoursUntilReset = Math.floor(msUntilReset / (1000 * 60 * 60))
        const minutesUntilReset = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60))
        
        if (hoursUntilReset > 0) {
          timeUntilReset = `${hoursUntilReset}h ${minutesUntilReset}m`
        } else {
          timeUntilReset = `${minutesUntilReset}m`
        }
      }

      setLimits({
        canPost,
        postsToday,
        maxPosts: 3,
        timeUntilReset
      })
    } catch (err) {
      console.error('Failed to check post limits:', err)
      setLimits({
        canPost: false,
        postsToday: 0,
        maxPosts: 3,
        timeUntilReset: null
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkLimits()
  }, [user, isAuthenticated])

  return {
    ...limits,
    loading,
    refresh: checkLimits
  }
}