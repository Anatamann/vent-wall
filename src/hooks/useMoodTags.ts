import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { MoodTag } from '../lib/types'

export function useMoodTags() {
  const [tags, setTags] = useState<MoodTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTags = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.moodTags.list()
      setTags(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch mood tags'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTags()
  }, [])

  return {
    tags,
    loading,
    error,
    refetch: fetchTags,
  }
}