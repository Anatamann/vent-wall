import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { MoodTag } from '../lib/supabase'

export function useMoodTags() {
  const [tags, setTags] = useState<MoodTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTags = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('mood_tags')
        .select('*')
        .order('name')

      if (fetchError) throw fetchError

      setTags(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch mood tags')
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
    refetch: fetchTags
  }
}