import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { api } from '../lib/api'
import { MAX_POSTS_PER_DAY } from '../lib/constants'

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
    maxPosts: MAX_POSTS_PER_DAY,
    timeUntilReset: null,
  })
  const [loading, setLoading] = useState(true)

  const checkLimits = async () => {
    if (!user || !isAuthenticated) {
      setLimits({
        canPost: false,
        postsToday: 0,
        maxPosts: MAX_POSTS_PER_DAY,
        timeUntilReset: null,
      })
      setLoading(false)
      return
    }

    try {
      const data = await api.users.postLimits()
      setLimits(data)
    } catch (err) {
      console.error('Failed to check post limits:', err)
      setLimits({
        canPost: false,
        postsToday: 0,
        maxPosts: MAX_POSTS_PER_DAY,
        timeUntilReset: null,
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
    refresh: checkLimits,
  }
}