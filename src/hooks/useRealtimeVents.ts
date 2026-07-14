import { useState, useEffect, useCallback } from 'react'
import { api, getToken } from '../lib/api'
import type { Vent } from '../lib/types'
import type { SortOption, TimeFilter } from '../components/FeedFilters'

interface UseRealtimeVentsOptions {
  selectedTags: string[]
  sortBy: SortOption
  timeFilter: TimeFilter
  pageSize?: number
  /** Advanced search: partial username match */
  username?: string
  /** Advanced search: vent content query */
  query?: string
  minReactions?: number
}

const POLL_INTERVAL_MS = 30_000

function getUserIdFromToken(): string | null {
  const token = getToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.userId || null
  } catch {
    return null
  }
}

export function useRealtimeVents({
  selectedTags,
  sortBy,
  timeFilter,
  pageSize = 20,
  username = '',
  query = '',
  minReactions = 0,
}: UseRealtimeVentsOptions) {
  const [vents, setVents] = useState<Vent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  const fetchVents = useCallback(
    async (reset: boolean = true) => {
      try {
        if (reset) {
          setLoading(true)
          setPage(0)
        } else {
          setLoadingMore(true)
        }
        setError(null)

        const offset = reset ? 0 : page * pageSize
        const apiSort = sortBy === ('relevance' as SortOption) ? 'newest' : sortBy
        const data = await api.vents.list({
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          sort: apiSort,
          time: timeFilter,
          offset,
          limit: pageSize,
          username: username.trim() || undefined,
          q: query.trim() || undefined,
          min_reactions: minReactions > 0 ? minReactions : undefined,
        })

        if (reset) {
          setVents(data)
        } else {
          setVents((prev) => [...prev, ...data])
        }

        setHasMore(data.length === pageSize)

        if (!reset) {
          setPage((prev) => prev + 1)
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch vents'
        setError(message)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [selectedTags, sortBy, timeFilter, page, pageSize, username, query, minReactions]
  )

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchVents(false)
    }
  }, [fetchVents, loadingMore, hasMore])

  const refresh = useCallback(() => {
    fetchVents(true)
  }, [fetchVents])

  const addReaction = useCallback(
    async (ventId: string, emoji: string) => {
      const userId = getUserIdFromToken()
      if (!userId) return

      try {
        setVents((prev) =>
          prev.map((vent) => {
            if (vent.id !== ventId) return vent

            const existingReaction = vent.reactions?.find(
              (r) => r.user_id === userId && r.emoji === emoji
            )

            if (existingReaction) {
              return {
                ...vent,
                reactions: vent.reactions?.filter((r) => r.id !== existingReaction.id) || [],
              }
            }

            const newReaction = {
              id: `temp-${Date.now()}`,
              vent_id: ventId,
              user_id: userId,
              emoji,
              created_at: new Date().toISOString(),
            }

            return {
              ...vent,
              reactions: [...(vent.reactions || []), newReaction],
            }
          })
        )

        await api.vents.toggleReaction(ventId, emoji)
        setTimeout(refresh, 500)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update reaction'
        console.error('Failed to add reaction:', message)
        refresh()
      }
    },
    [refresh]
  )

  useEffect(() => {
    fetchVents(true)
  }, [selectedTags, sortBy, timeFilter, username, query, minReactions])

  useEffect(() => {
    const interval = setInterval(() => refresh(), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [refresh])

  return {
    vents,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
    addReaction,
  }
}
