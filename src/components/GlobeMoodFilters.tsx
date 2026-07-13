import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { MoodTag } from '../lib/types'
import MoodTagChip, { moodTagMoreClassName } from './MoodTagChip'

interface GlobeMoodFiltersProps {
  tags: MoodTag[]
  loading?: boolean
  onSelect: (tagId: string) => void
}

const MAX_ROWS = 2
const GAP_PX = 6

/**
 * Full-width multi-row mood filters for Vent Globe (standard chip design).
 * Fills up to MAX_ROWS, then collapses remainder into “+N more”.
 */
export default function GlobeMoodFilters({ tags, loading, onSelect }: GlobeMoodFiltersProps) {
  const measureRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [fitCount, setFitCount] = useState(tags.length)

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
      <div className="flex w-full flex-wrap justify-center gap-1.5 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="h-7 rounded-full bg-slate-800/80 animate-pulse"
            style={{ width: `${64 + (i % 4) * 14}px` }}
          />
        ))}
      </div>
    )
  }

  if (tags.length === 0) return null

  const remaining = Math.max(0, tags.length - fitCount)
  const shown = expanded ? tags : tags.slice(0, fitCount)

  return (
    <div className="relative w-full max-w-none">
      <div
        ref={measureRef}
        className="pointer-events-none absolute left-0 right-0 top-0 -z-10 flex w-full flex-wrap justify-center gap-1.5 opacity-0"
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
        className={`flex w-full flex-wrap justify-center gap-1.5 overflow-x-hidden ${
          expanded ? 'max-h-[28vh] overflow-y-auto overscroll-contain' : 'overflow-y-hidden'
        }`}
      >
        {shown.map((tag) => (
          <MoodTagChip key={tag.id} tag={tag} onClick={() => onSelect(tag.id)} />
        ))}

        {!expanded && remaining > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={moodTagMoreClassName}
            aria-label={`Show ${remaining} more mood filters`}
          >
            +{remaining} more
          </button>
        )}

        {expanded && remaining > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className={moodTagMoreClassName}
            aria-label="Show fewer mood filters"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  )
}
