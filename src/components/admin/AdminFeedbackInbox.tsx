import { useCallback, useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { api } from '../../lib/api'
import type { FeedbackStatus, UserFeedback } from '../../lib/types'
import LoadingSpinner from '../LoadingSpinner'

const STATUS_OPTIONS: Array<{ value: FeedbackStatus | 'all'; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'triaged', label: 'Triaged' },
  { value: 'planned', label: 'Planned' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
]

export default function AdminFeedbackInbox() {
  const [status, setStatus] = useState<FeedbackStatus | 'all'>('new')
  const [items, setItems] = useState<UserFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadFeedback = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.admin.listFeedback({ status, per_page: 50 })
      setItems(data.items)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load feedback'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    loadFeedback()
  }, [loadFeedback])

  const updateStatus = async (id: string, nextStatus: FeedbackStatus) => {
    try {
      setUpdatingId(id)
      await api.admin.updateFeedback(id, { status: nextStatus })
      await loadFeedback()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update feedback'
      setError(message)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatus(option.value)}
            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
              status === option.value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {!loading && error && (
        <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="card text-center py-10 text-gray-500 dark:text-gray-400">
          No feedback in this view.
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="card border border-gray-200 dark:border-gray-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.username || 'User'}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                  {item.status}
                </span>
              </div>

              {item.tag_request && (
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100">Tag request:</span>{' '}
                  {item.tag_request}
                </p>
              )}

              <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {item.message}
              </p>

              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                {(['triaged', 'planned', 'closed'] as FeedbackStatus[]).map((next) => (
                  <button
                    key={next}
                    type="button"
                    disabled={updatingId === item.id || item.status === next}
                    onClick={() => updateStatus(item.id, next)}
                    className="btn-secondary text-[10px] sm:text-xs py-1 px-2 disabled:opacity-50"
                  >
                    Mark {next}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}