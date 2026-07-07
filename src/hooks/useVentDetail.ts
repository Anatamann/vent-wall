import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Vent } from '../lib/types'

export function useVentDetail(ventSlug: string | undefined, currentUserId?: string) {
  const [vent, setVent] = useState<Vent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadVent = useCallback(async () => {
    if (!ventSlug) {
      setVent(null)
      setLoading(false)
      setError('Post not found')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await api.vents.get(ventSlug)
      setVent(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load post'
      setError(message)
      setVent(null)
    } finally {
      setLoading(false)
    }
  }, [ventSlug])

  useEffect(() => {
    loadVent()
  }, [loadVent])

  const addReaction = useCallback(
    async (emoji: string) => {
      if (!vent || !currentUserId) return

      setVent((current) => {
        if (!current) return current

        const existing = current.reactions?.find(
          (r) => r.user_id === currentUserId && r.emoji === emoji
        )

        if (existing) {
          return {
            ...current,
            reactions: current.reactions?.filter((r) => r.id !== existing.id) || [],
          }
        }

        return {
          ...current,
          reactions: [
            ...(current.reactions || []),
            {
              id: `optimistic-${Date.now()}`,
              vent_id: current.id,
              user_id: currentUserId,
              emoji,
              created_at: new Date().toISOString(),
            },
          ],
        }
      })

      try {
        await api.vents.toggleReaction(vent.slug, emoji)
        await loadVent()
      } catch {
        await loadVent()
        throw new Error('Failed to update reaction')
      }
    },
    [vent, currentUserId, loadVent]
  )

  const addComment = useCallback(
    async (emoji: string) => {
      if (!vent) return

      try {
        const result = await api.vents.addComment(vent.slug, emoji)
        setVent((current) =>
          current
            ? {
                ...current,
                comments: [...(current.comments || []), result.comment],
              }
            : current
        )
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to add comment'
        throw new Error(message)
      }
    },
    [vent]
  )

  return {
    vent,
    loading,
    error,
    reload: loadVent,
    addReaction,
    addComment,
  }
}