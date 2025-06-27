import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Vent } from '../lib/supabase'

export function useVents(selectedTags: string[] = []) {
  const [vents, setVents] = useState<Vent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVents = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('vents')
        .select(`
          *,
          user:users(id, username),
          mood_tags:vent_tags(
            mood_tags(id, name, color, emoji)
          ),
          reactions(id, emoji, user_id)
        `)
        .is('expires_at', null) // Only non-expired vents for now
        .order('created_at', { ascending: false })
        .limit(20)


      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Transform the data to flatten mood_tags
      let transformedVents = data?.map(vent => ({
        ...vent,
        mood_tags: vent.mood_tags?.map((vt: any) => vt.mood_tags).filter(Boolean) || []
      })) || []

      // Apply tag filters after transformation if any are selected
      if (selectedTags.length > 0) {
        transformedVents = transformedVents.filter(vent => 
          vent.mood_tags.some((tag: any) => selectedTags.includes(tag.id))
        )
      }

      setVents(transformedVents)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch vents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVents()
  }, [selectedTags])

  const addReaction = async (ventId: string, emoji: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Must be logged in to react')

      const { error } = await supabase
        .from('reactions')
        .insert({
          vent_id: ventId,
          user_id: user.id,
          emoji
        })

      if (error) throw error

      // Refresh vents to show new reaction
      fetchVents()
    } catch (err: any) {
      console.error('Failed to add reaction:', err.message)
    }
  }

  return {
    vents,
    loading,
    error,
    refetch: fetchVents,
    addReaction
  }
}