import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { X, MessageCircle, Heart } from 'lucide-react'
import type { GlobeVentSummary } from '../lib/types'
import LoadingSpinner from './LoadingSpinner'

export interface GlobePopupContext {
  title: string
  subtitle?: string | null
  emoticon?: string | null
  accentColor?: string | null
}

interface GlobePopupProps {
  open: boolean
  context: GlobePopupContext | null
  vents: GlobeVentSummary[]
  loading: boolean
  error: string | null
  onClose: () => void
}

function previewText(content: string, max = 140): string {
  const trimmed = content.trim()
  if (!trimmed) return 'GIF vent'
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max).trimEnd()}…`
}

export default function GlobePopup({
  open,
  context,
  vents,
  loading,
  error,
  onClose,
}: GlobePopupProps) {
  if (!open || !context) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="globe-popup-title"
    >
      {/* Globe remains faintly visible behind frosted glass */}
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-md"
        aria-label="Close popup"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-[1100px] max-h-[88vh] overflow-hidden rounded-2xl
          border border-white/15 shadow-2xl
          bg-slate-900/75 backdrop-blur-2xl"
        style={{
          boxShadow: '0 0 0 1px rgba(125,211,252,0.08), 0 25px 80px rgba(0,0,0,0.55)',
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 sm:px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {context.emoticon && (
                <span
                  className="flex items-center justify-center w-10 h-10 rounded-full text-xl sm:text-2xl shrink-0
                    bg-sky-400/10 border border-sky-300/20
                    shadow-[0_0_18px_rgba(56,189,248,0.25)]"
                  aria-hidden
                >
                  {context.emoticon}
                </span>
              )}
              <h2
                id="globe-popup-title"
                className="text-base sm:text-xl font-semibold text-slate-50 truncate"
              >
                {context.title}
              </h2>
            </div>
            {context.subtitle && (
              <p className="mt-1.5 text-xs sm:text-sm text-slate-400">{context.subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(88vh-5rem)] p-4 sm:p-6">
          {loading && (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-12 text-sm text-red-400">{error}</div>
          )}

          {!loading && !error && vents.length === 0 && (
            <div className="text-center py-12 text-sm text-slate-400">
              No vents from the last 24 hours in this view.
            </div>
          )}

          {!loading && !error && vents.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {vents.map((vent) => {
                const mood = vent.mood_tags[0]
                return (
                  <article
                    key={vent.id}
                    className="rounded-xl border border-white/10 bg-slate-800/60 p-4 shadow-sm flex flex-col
                      hover:border-sky-400/25 hover:bg-slate-800/80 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="flex items-center justify-center w-9 h-9 rounded-full text-lg shrink-0
                          bg-sky-400/10 border border-sky-300/15"
                        title={mood?.name}
                        aria-hidden
                      >
                        {mood?.emoji || '💬'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">
                          {previewText(vent.content)}
                        </p>
                        <p className="mt-2 text-[10px] sm:text-xs text-slate-500">
                          {formatDistanceToNow(new Date(vent.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 text-[11px] sm:text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1" title="Total engagement">
                          <Heart className="w-3.5 h-3.5" />
                          {vent.engagement_count}
                        </span>
                        <span className="inline-flex items-center gap-1" title="Comments">
                          <MessageCircle className="w-3.5 h-3.5" />
                          {vent.comment_count}
                        </span>
                      </div>
                      <Link
                        to={`/post/${vent.slug}`}
                        className="text-[11px] sm:text-xs font-medium text-sky-400/90 hover:text-sky-300 transition-colors shrink-0"
                      >
                        View full vent
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
