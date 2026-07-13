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
      <div className="glass-panel text-center py-10 px-4 text-red-400">
        {error || 'Unable to load overview'}
      </div>
    )
  }

  const { totals, new_feedback_count, top_tags, top_emojis } = overview

  const stats = [
    { label: 'Vents today', value: totals.vents_today, accent: 'text-sky-400' },
    { label: 'Reactions today', value: totals.reactions_today, accent: 'text-rose-400' },
    { label: 'Comments today', value: totals.comments_today, accent: 'text-emerald-400' },
    { label: 'GIF comments', value: totals.gif_comments_today, accent: 'text-violet-400' },
    { label: 'New users', value: totals.new_users_today, accent: 'text-amber-400' },
  ]

  return (
    <div className="space-y-5 sm:space-y-6">
      {new_feedback_count > 0 && (
        <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-xs sm:text-sm text-sky-100">
          {new_feedback_count} new feedback{' '}
          {new_feedback_count === 1 ? 'message' : 'messages'} waiting in the Feedback tab.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/10 bg-slate-800/50 backdrop-blur-sm text-center py-4 px-2"
          >
            <p className={`text-xl sm:text-2xl font-bold tabular-nums ${stat.accent}`}>
              {stat.value}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="glass-panel p-4 sm:p-5">
          <h3 className="text-xs sm:text-sm font-semibold text-slate-100 mb-3">
            Top mood tags (7d, on Wall)
          </h3>
          {top_tags.length === 0 ? (
            <p className="text-xs sm:text-sm text-slate-500">No tag data yet.</p>
          ) : (
            <ul className="space-y-2">
              {top_tags.map((tag) => (
                <li
                  key={tag.name}
                  className="flex items-center justify-between text-xs sm:text-sm text-slate-300 rounded-lg border border-white/5 bg-slate-800/40 px-3 py-2"
                >
                  <span>
                    {tag.emoji} {tag.name}
                  </span>
                  <span className="font-medium text-slate-100 tabular-nums">{tag.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-panel p-4 sm:p-5">
          <h3 className="text-xs sm:text-sm font-semibold text-slate-100 mb-3">
            Top reaction emojis (7d)
          </h3>
          {top_emojis.length === 0 ? (
            <p className="text-xs sm:text-sm text-slate-500">No emoji data yet.</p>
          ) : (
            <ul className="space-y-2">
              {top_emojis.map((item) => (
                <li
                  key={item.emoji}
                  className="flex items-center justify-between text-xs sm:text-sm text-slate-300 rounded-lg border border-white/5 bg-slate-800/40 px-3 py-2"
                >
                  <span className="text-lg sm:text-xl">{item.emoji}</span>
                  <span className="font-medium text-slate-100 tabular-nums">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
