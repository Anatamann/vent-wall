import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { AdminOverview } from '../../lib/types'
import LoadingSpinner from '../LoadingSpinner'

export default function AdminOverviewPanel() {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    api.admin
      .overview()
      .then((data) => {
        if (active) setOverview(data)
      })
      .catch((err: unknown) => {
        if (!active) return
        const message = err instanceof Error ? err.message : 'Failed to load overview'
        setError(message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !overview) {
    return (
      <div className="card text-center py-10 text-red-600 dark:text-red-400">
        {error || 'Unable to load overview'}
      </div>
    )
  }

  const { totals, new_feedback_count, top_tags, top_emojis } = overview

  return (
    <div className="space-y-6">
      {new_feedback_count > 0 && (
        <div className="rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 px-4 py-3 text-xs sm:text-sm text-primary-800 dark:text-primary-200">
          {new_feedback_count} new feedback {new_feedback_count === 1 ? 'message' : 'messages'} waiting in the Feedback tab.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Vents today', value: totals.vents_today },
          { label: 'Reactions today', value: totals.reactions_today },
          { label: 'Comments today', value: totals.comments_today },
          { label: 'GIF comments', value: totals.gif_comments_today },
          { label: 'New users', value: totals.new_users_today },
        ].map((stat) => (
          <div key={stat.label} className="card text-center py-4">
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Top mood tags (7d, on Wall)
          </h3>
          {top_tags.length === 0 ? (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">No tag data yet.</p>
          ) : (
            <ul className="space-y-2">
              {top_tags.map((tag) => (
                <li
                  key={tag.name}
                  className="flex items-center justify-between text-xs sm:text-sm text-gray-700 dark:text-gray-300"
                >
                  <span>
                    {tag.emoji} {tag.name}
                  </span>
                  <span className="font-medium">{tag.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Top reaction emojis (7d)
          </h3>
          {top_emojis.length === 0 ? (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">No emoji data yet.</p>
          ) : (
            <ul className="space-y-2">
              {top_emojis.map((item) => (
                <li
                  key={item.emoji}
                  className="flex items-center justify-between text-xs sm:text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className="text-lg sm:text-xl">{item.emoji}</span>
                  <span className="font-medium">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}