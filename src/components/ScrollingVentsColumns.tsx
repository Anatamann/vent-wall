import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import VentCard from './VentCard'
import type { Vent } from '../lib/types'

interface ScrollingVentsColumnsProps {
  vents: Vent[]
  /** Fetch more when the wall is sparse so columns have enough cards. */
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}

const DESKTOP_COLUMNS = 3

/** Deterministic 0–1 hash from string (stable across renders). */
function hash01(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

/**
 * Split vents across columns with a light shuffle so neighboring cards
 * are not purely sequential (looks more “random” without reshuffling every render).
 */
function distributeVents(vents: Vent[], columnCount: number): Vent[][] {
  const columns: Vent[][] = Array.from({ length: columnCount }, () => [])
  if (vents.length === 0) return columns

  const ranked = vents
    .map((v, i) => ({ v, score: hash01(`${v.id}:${i}`) }))
    .sort((a, b) => a.score - b.score)

  ranked.forEach(({ v }, i) => {
    columns[i % columnCount].push(v)
  })

  // Rebalance slightly so no column is empty when we have few vents
  if (vents.length > 0) {
    for (let c = 0; c < columnCount; c++) {
      if (columns[c].length === 0) {
        const donor = columns.reduce((best, col, idx) =>
          col.length > columns[best].length ? idx : best
        , 0)
        if (columns[donor].length > 1) {
          columns[c].push(columns[donor].pop()!)
        }
      }
    }
  }

  return columns
}

function ScrollingColumn({
  vents,
  columnIndex,
  columnCount,
  slow,
}: {
  vents: Vent[]
  columnIndex: number
  columnCount: number
  slow: boolean
}) {
  const [paused, setPaused] = useState(false)

  // Distinct vertical phase per column so cards don’t share a “row”
  const startOffsetPx = useMemo(() => {
    const base = hash01(`col-offset-${columnIndex}`)
    // Desktop: staggered 24–140px; mobile: smaller drift
    const min = slow ? 12 : 28
    const span = slow ? 48 : 120
    return Math.round(min + base * span + columnIndex * (slow ? 18 : 36))
  }, [columnIndex, slow])

  // Slightly different speeds so columns drift out of phase
  const durationSec = useMemo(() => {
    const jitter = hash01(`col-speed-${columnIndex}`)
    if (slow) {
      // Mobile: very slow (full loop ~90–140s)
      return 95 + jitter * 50 + columnIndex * 8
    }
    // Desktop: moderate, each column different
    return 42 + jitter * 22 + columnIndex * 7
  }, [columnIndex, slow])

  // Need enough cards for a pleasant loop; duplicate list for seamless CSS scroll
  const loopVents = vents.length > 0 ? vents : []
  const trackVents =
    loopVents.length === 0
      ? []
      : loopVents.length < 3
        ? [...loopVents, ...loopVents, ...loopVents, ...loopVents]
        : [...loopVents, ...loopVents]

  if (trackVents.length === 0) return null

  return (
    <div
      className="vent-marquee-column relative min-w-0 flex-1 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setPaused(false)
        }
      }}
    >
      <div
        className="vent-marquee-track flex flex-col gap-7 sm:gap-8 md:gap-10 will-change-transform"
        style={
          {
            '--marquee-duration': `${durationSec}s`,
            '--marquee-start': `-${startOffsetPx}px`,
            animationPlayState: paused ? 'paused' : 'running',
            // Stagger columns with padding only (not negative margins that collapse gap)
            paddingTop: columnCount > 1 ? `${12 + ((columnIndex * 40) % 72)}px` : '8px',
            paddingBottom: '8px',
          } as CSSProperties
        }
      >
        {trackVents.map((vent, i) => (
          <div
            key={`${vent.id}-${i}`}
            className="vent-marquee-card shrink-0"
            style={{
              // Small extra air after some cards (only positive — keeps breathing room)
              marginBottom:
                columnCount > 1 && i % 3 === 1
                  ? `${8 + Math.round(hash01(`${vent.id}-gap-${columnIndex}`) * 12)}px`
                  : undefined,
            }}
          >
            <VentCard vent={vent} animateOnScroll={false} />
          </div>
        ))}
      </div>

      {/* Soft edge fade */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-10 sm:h-14 z-[1]
          bg-gradient-to-b from-[#070b14] via-[#070b14]/80 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-10 sm:h-14 z-[1]
          bg-gradient-to-t from-[#070b14] via-[#070b14]/80 to-transparent"
        aria-hidden
      />
    </div>
  )
}

/**
 * Auto-scrolling vent wall: 3 columns on desktop (hover pauses one column),
 * single very-slow column on narrow screens. Cards are staggered so they
 * don’t sit on the same horizontal line.
 */
export default function ScrollingVentsColumns({
  vents,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: ScrollingVentsColumnsProps) {
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : true
  )
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMq = () => setIsNarrow(mq.matches)
    const onRm = () => setPrefersReducedMotion(rm.matches)
    onMq()
    onRm()
    mq.addEventListener('change', onMq)
    rm.addEventListener('change', onRm)
    return () => {
      mq.removeEventListener('change', onMq)
      rm.removeEventListener('change', onRm)
    }
  }, [])

  // Keep columns fed when filters return few items
  useEffect(() => {
    if (hasMore && !loadingMore && vents.length < 12 && onLoadMore) {
      onLoadMore()
    }
  }, [hasMore, loadingMore, vents.length, onLoadMore])

  const columnCount = isNarrow ? 1 : DESKTOP_COLUMNS
  const columns = useMemo(
    () => distributeVents(vents, columnCount),
    [vents, columnCount]
  )

  if (prefersReducedMotion) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full">
        {vents.map((vent) => (
          <VentCard key={vent.id} vent={vent} animateOnScroll={false} />
        ))}
      </div>
    )
  }

  return (
    <div
      className="vent-marquee-wall relative w-full h-[min(72vh,640px)] md:h-[min(78vh,820px)]"
    >
      <div
        className={`flex h-full w-full gap-4 md:gap-6 lg:gap-8 ${
          isNarrow ? 'px-0' : 'px-1'
        }`}
      >
        {columns.map((colVents, idx) => (
          <ScrollingColumn
            key={`col-${columnCount}-${idx}`}
            vents={colVents}
            columnIndex={idx}
            columnCount={columnCount}
            slow={isNarrow}
          />
        ))}
      </div>
    </div>
  )
}
