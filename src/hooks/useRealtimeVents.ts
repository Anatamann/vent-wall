import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Vent } from '../lib/supabase'
import type { SortOption, TimeFilter } from '../components/FeedFilters'

interface UseRealtimeVentsOptions {
  selectedTags: string[]
  sortBy: SortOption
  timeFilter: TimeFilter
  pageSize?: number
}

export function useRealtimeVents({
  selectedTags,
  sortBy,
  timeFilter,
  pageSize = 20
}: UseRealtimeVentsOptions) {
  const [vents, setVents] = useState<Vent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  // Build query based on filters
  const buildQuery = useCallback((offset: number = 0, limit: number = pageSize) => {
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
      .gte('expires_at', new Date().toISOString())
      .range(offset, offset + limit - 1)

    // Apply time filter
    if (timeFilter !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (timeFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        default:
          startDate = new Date(0)
      }

      query = query.gte('created_at', startDate.toISOString())
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      case 'most_reactions':
        // Note: This is a simplified approach. For better performance,
        // you might want to add a reaction_count column to the vents table
        query = query.order('created_at', { ascending: false })
        break
      case 'trending':
        // Trending = recent posts with good engagement
        query = query.order('created_at', { ascending: false })
        break
    }

    return query
  }, [sortBy, timeFilter, pageSize])

  // Transform and filter vents
  const transformVents = useCallback((data: any[]) => {
    let transformedVents = data?.map(vent => ({
      ...vent,
      mood_tags: vent.mood_tags?.map((vt: any) => vt.mood_tags).filter(Boolean) || []
    })) || []

    // Apply tag filters after transformation (client-side filtering)
    if (selectedTags.length > 0) {
      transformedVents = transformedVents.filter(vent => 
        vent.mood_tags.some((tag: any) => selectedTags.includes(tag.id))
      )
    }

    // Apply client-side sorting for reaction-based sorts
    if (sortBy === 'most_reactions') {
      transformedVents.sort((a, b) => {
        const aReactions = a.reactions?.length || 0
        const bReactions = b.reactions?.length || 0
        return bReactions - aReactions
      })
    } else if (sortBy === 'trending') {
      // Trending algorithm: recent posts with good engagement
      transformedVents.sort((a, b) => {
        const now = Date.now()
        const aAge = now - new Date(a.created_at).getTime()
        const bAge = now - new Date(b.created_at).getTime()
        const aReactions = a.reactions?.length || 0
        const bReactions = b.reactions?.length || 0
        
        // Score based on reactions and recency (higher is better)
        const aScore = aReactions / (aAge / (1000 * 60 * 60) + 1) // reactions per hour age
        const bScore = bReactions / (bAge / (1000 * 60 * 60) + 1)
        
        return bScore - aScore
      })
    }

    return transformedVents
  }, [selectedTags, sortBy])

  // Fetch initial vents
  const fetchVents = useCallback(async (reset: boolean = true) => {
    try {
      if (reset) {
        setLoading(true)
        setPage(0)
      } else {
        setLoadingMore(true)
      }
      setError(null)

      const offset = reset ? 0 : page * pageSize
      const query = buildQuery(offset, pageSize)
      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Debug logging for development
      if (process.env.NODE_ENV === 'development') {
        console.log('Fetched vents from database:', data?.length || 0)
        console.log('Selected tags for filtering:', selectedTags)
      }

      const transformedVents = transformVents(data || [])
      
      // Debug logging for development
      if (process.env.NODE_ENV === 'development') {
        console.log('Transformed and filtered vents:', transformedVents.length)
      }
      
      if (reset) {
        setVents(transformedVents)
      } else {
        setVents(prev => [...prev, ...transformedVents])
      }

      // Check if there are more vents to load
      setHasMore((data?.length || 0) === pageSize)
      
      if (!reset) {
        setPage(prev => prev + 1)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch vents')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [buildQuery, transformVents, page, pageSize])

  // Load more vents
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchVents(false)
    }
  }, [fetchVents, loadingMore, hasMore])

  // Refresh vents
  const refresh = useCallback(() => {
    fetchVents(true)
  }, [fetchVents])

  // Add reaction optimistically
  const addReaction = useCallback(async (ventId: string, emoji: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Must be logged in to react')

      // Optimistic update
      setVents(prev => prev.map(vent => {
        if (vent.id === ventId) {
          const existingReaction = vent.reactions?.find(
            r => r.user_id === user.id && r.emoji === emoji
          )

          if (existingReaction) {
            // Remove reaction
            return {
              ...vent,
              reactions: vent.reactions?.filter(r => r.id !== existingReaction.id) || []
            }
          } else {
            // Add reaction
            const newReaction = {
              id: `temp-${Date.now()}`,
              vent_id: ventId,
              user_id: user.id,
              emoji,
              created_at: new Date().toISOString()
            }
            return {
              ...vent,
              reactions: [...(vent.reactions || []), newReaction]
            }
          }
        }
        return vent
      }))

      // Check if reaction already exists
      const { data: existingReaction } = await supabase
        .from('reactions')
        .select('id')
        .eq('vent_id', ventId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .single()

      if (existingReaction) {
        // Remove existing reaction
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('id', existingReaction.id)

        if (error) throw error
      } else {
        // Add new reaction
        const { error } = await supabase
          .from('reactions')
          .insert({
            vent_id: ventId,
            user_id: user.id,
            emoji
          })

        if (error) throw error
      }

      // Refresh to get accurate data
      setTimeout(refresh, 500)
    } catch (err: any) {
      console.error('Failed to add reaction:', err.message)
      // Revert optimistic update on error
      refresh()
    }
  }, [refresh])

  // Set up real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('vents_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vents'
        },
        () => {
          // Refresh vents when changes occur
          refresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions'
        },
        () => {
          // Refresh vents when reactions change
          refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refresh])

  // Fetch vents when filters change
  useEffect(() => {
    fetchVents(true)
  }, [selectedTags, sortBy, timeFilter])

  return {
    vents,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
    addReaction
  }
}