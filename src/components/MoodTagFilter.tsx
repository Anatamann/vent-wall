import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import type { MoodTag } from '../lib/types'
import MoodTagChip, { moodTagMoreClassName } from './MoodTagChip'

interface MoodTagFilterProps {
  tags: MoodTag[]
  selectedTags: string[]
  onTagSelect: (tagId: string) => void
  onSearchOpen: () => void
  loading?: boolean
}

const MAX_ROWS = 2
const GAP_PX = 6

/**
 * Wall mood filter — same chip language as Vent Globe.
 * Multi-row wrap, full width, collapse remainder into “+N more”.
 */
export default function MoodTagFilter({
  tags,
  selectedTags,
  onTagSelect,
  onSearchOpen,
  loading = false,
}: MoodTagFilterProps) {
  const measureRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [fitCount, setFitCount] = useState(tags.length)

  const clearAll = () => {
    selectedTags.forEach((id) => onTagSelect(id))
  }

  const recomputeFit = useCallback(() => {
    const root = measureRef.current
    if (!root || tags.length === 0) {
      setFitCount(tags.length)
      return
    }

    const chips = Array.from(root.querySelectorAll<HTMLElement>('[data-tag-chip]'))
    if (chips.length === 0) {
      setFitCount(0)
      return
    }

    const firstTop = chips[0].offsetTop
    const rowH = chips[0].offsetHeight || 28
    const maxBottom = firstTop + MAX_ROWS * rowH + (MAX_ROWS - 1) * GAP_PX + 2
    const containerW = root.clientWidth
    const moreEl = root.querySelector<HTMLElement>('[data-more-measure]')
    const moreW = moreEl?.offsetWidth ?? 96

    let within = 0
    for (const chip of chips) {
      if (chip.offsetTop + chip.offsetHeight <= maxBottom) within++
      else break
    }

    // +1 for “All Moods” which is not a data-tag-chip in measure? We measure only mood tags.
    // Fit count is for mood tags only; All Moods is always shown separately.
    if (within >= tags.length) {
      setFitCount(tags.length)
      return
    }

    const fits = (n: number): boolean => {
      if (n <= 0) return false
      if (n > chips.length) return false
      const last = chips[n - 1]
      if (last.offsetTop + last.offsetHeight > maxBottom) return false

      const lastRowTop = last.offsetTop
      let rowRight = 0
      for (let i = 0; i < n; i++) {
        const c = chips[i]
        if (Math.abs(c.offsetTop - lastRowTop) <= 2) {
          rowRight = Math.max(rowRight, c.offsetLeft + c.offsetWidth)
        }
      }

      if (rowRight + GAP_PX + moreW <= containerW + 1) return true
      const moreBottom = lastRowTop + rowH + GAP_PX + rowH
      return moreBottom <= maxBottom + 1
    }

    let lo = 1
    let hi = Math.max(1, within)
    let best = 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (fits(mid)) {
        best = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    setFitCount(Math.min(best, tags.length))
  }, [tags.length])

  useLayoutEffect(() => {
    recomputeFit()
    const root = measureRef.current
    if (!root) return
    const ro = new ResizeObserver(() => recomputeFit())
    ro.observe(root)
    const t = window.setTimeout(recomputeFit, 50)
    return () => {
      ro.disconnect()
      window.clearTimeout(t)
    }
  }, [recomputeFit, tags])

  useLayoutEffect(() => {
    setExpanded(false)
  }, [tags])

  if (loading) {
    return (
      <div className="glass-panel mb-6 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="h-7 rounded-full bg-slate-700/60 animate-pulse"
              style={{ width: `${64 + (i % 4) * 14}px` }}
            />
          ))}
        </div>
      </div>
    )
  }

  const remaining = Math.max(0, tags.length - fitCount)
  const shown = expanded ? tags : tags.slice(0, fitCount)

  return (
    <div className="glass-panel mb-6 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 min-w-0">
        <h2 className="text-sm sm:text-base font-semibold text-slate-100">Filter by Mood</h2>
        <button
          type="button"
          onClick={onSearchOpen}
          className="flex items-center space-x-2 px-3 py-1.5 text-xs sm:text-sm text-slate-400
            hover:text-slate-100 hover:bg-white/5 rounded-full transition-colors"
        >
          <Search className="w-4 h-4" />
          <span>Search tags</span>
        </button>
      </div>

      <div className="relative w-full">
        {/* Measure layer */}
        <div
          ref={measureRef}
          className="pointer-events-none absolute left-0 right-0 top-0 -z-10 flex w-full flex-wrap gap-1.5 opacity-0"
          aria-hidden
        >
          {tags.map((tag) => (
            <MoodTagChip key={`m-${tag.id}`} tag={tag} measure />
          ))}
          <span data-more-measure className={moodTagMoreClassName}>
            +999 more
          </span>
        </div>

        <div
          className={`flex w-full flex-wrap gap-1.5 overflow-x-hidden ${
            expanded ? 'max-h-[32vh] overflow-y-auto overscroll-contain' : 'overflow-y-hidden'
          }`}
        >
          <button
            type="button"
            onClick={clearAll}
            className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] sm:text-[11px] font-medium
              border backdrop-blur-sm transition-all
              ${
                selectedTags.length === 0
                  ? 'border-sky-400/50 bg-sky-500/15 text-sky-100 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                  : 'border-white/10 bg-slate-800/80 text-slate-300 hover:border-sky-400/30 hover:bg-slate-700/90'
              }`}
          >
            All Moods
          </button>

          {shown.map((tag) => (
            <MoodTagChip
              key={tag.id}
              tag={tag}
              selected={selectedTags.includes(tag.id)}
              onClick={() => onTagSelect(tag.id)}
            />
          ))}

          {!expanded && remaining > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className={moodTagMoreClassName}
              aria-label={`Show ${remaining} more mood tags`}
            >
              +{remaining} more
            </button>
          )}

          {expanded && remaining > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className={moodTagMoreClassName}
            >
              Show less
            </button>
          )}
        </div>
      </div>

      {selectedTags.length > 0 && (
        <p className="mt-3 pt-3 border-t border-white/10 text-xs text-slate-400">
          Filtering by {selectedTags.length} mood{selectedTags.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
