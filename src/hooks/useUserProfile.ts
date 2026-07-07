import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { api } from '../lib/api'
import type { User, Vent } from '../lib/types'

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
      setUserProfile(null)
      setUserVents([])
      setUserStats(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const data = await api.users.profile()
      setUserProfile(data.profile)
      setUserVents(data.vents)
      setUserStats(data.stats)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user profile'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const updateUsername = async (newUsername: string) => {
    if (!user) throw new Error('Not authenticated')

    if (newUsername.length < 3 || newUsername.length > 30) {
      throw new Error('Username must be between 3 and 30 characters')
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(newUsername)) {
      throw new Error('Username can only contain letters, numbers, underscores, and hyphens')
    }

    await api.users.updateUsername(newUsername)
    await fetchUserProfile()
  }

  const deleteVent = async (ventId: string) => {
    if (!user) throw new Error('Not authenticated')
    const vent = userVents.find((v) => v.id === ventId)
    await api.vents.delete(vent?.slug || ventId)
    await fetchUserProfile()
  }

  const setAvatarFromGif = async (gifId: string) => {
    if (!user) throw new Error('Not authenticated')
    const { user: updated } = await api.users.setAvatar(gifId)
    setUserProfile(updated)
    await fetchUserProfile()
  }

  const removeAvatar = async () => {
    if (!user) throw new Error('Not authenticated')
    const { user: updated } = await api.users.deleteAvatar()
    setUserProfile(updated)
    await fetchUserProfile()
  }

  const updateStatus = async (status: string) => {
    if (!user) throw new Error('Not authenticated')

    const trimmed = status.trim()
    if (trimmed.length > 30) {
      throw new Error('Status must be 30 characters or less')
    }
    if (trimmed && !/^[a-zA-Z0-9 ]+$/.test(trimmed)) {
      throw new Error('Status can only contain letters, numbers, and spaces')
    }

    const { user: updated } = await api.users.updateStatus(trimmed)
    setUserProfile(updated)
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
    setAvatarFromGif,
    removeAvatar,
    updateStatus,
    refresh: fetchUserProfile,
  }
}