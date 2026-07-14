import type { MoodTag } from '../lib/types'

export type MoodTagChipTag = Pick<MoodTag, 'id' | 'name' | 'color' | 'emoji'>

interface MoodTagChipProps {
  tag: MoodTagChipTag
  /** Toggle / filter selection */
  selected?: boolean
  onClick?: () => void
  /** Render as non-interactive label (e.g. on vent cards) */
  static?: boolean
  measure?: boolean
  className?: string
  size?: 'sm' | 'md'
  /**
   * Compact mobile-friendly chip: slightly tighter padding.
   * Name truncates so long tags (e.g. "Erotic Fantasy") never blow the layout.
   */
  compact?: boolean
}

/**
 * Standard mood tag chip — same design as Vent Globe filters.
 * Color dot · emoji · name on a translucent dark pill.
 */
export default function MoodTagChip({
  tag,
  selected = false,
  onClick,
  static: isStatic = false,
  measure = false,
  className = '',
  size = 'sm',
  compact = false,
}: MoodTagChipProps) {
  const sizeClass =
    size === 'md'
      ? compact
        ? 'px-2.5 py-1.5 text-xs gap-1.5'
        : 'px-3 py-1.5 text-xs sm:text-sm gap-2'
      : compact
        ? 'px-2 py-1 text-[10px] gap-1'
        : 'px-2.5 py-1 text-[10px] sm:text-[11px] gap-1.5'

  // shrink-0 keeps chips readable in scroll rows; max-w + truncate handles long names in cards.
  const base =
    `inline-flex max-w-full shrink-0 items-center rounded-full font-medium backdrop-blur-sm ` +
    `border transition-all ${sizeClass}`

  const tone = selected
    ? 'border-sky-400/50 bg-sky-500/15 text-sky-100 shadow-[0_0_12px_rgba(56,189,248,0.2)] scale-[1.02]'
    : 'border-white/10 bg-slate-800/80 text-slate-200 hover:border-sky-400/30 hover:bg-slate-700/90 hover:shadow-[0_0_12px_rgba(56,189,248,0.15)]'

  const interactive = !isStatic
    ? 'cursor-pointer hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40'
    : 'cursor-default'

  const content = (
    <>
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full shadow-[0_0_6px_currentColor]"
        style={{ backgroundColor: tag.color, color: tag.color }}
        aria-hidden
      />
      <span className="shrink-0 opacity-90" aria-hidden>
        {tag.emoji}
      </span>
      <span
        className={`min-w-0 truncate ${compact ? 'max-w-[5.75rem]' : 'max-w-[7.5rem] sm:max-w-[10rem]'}`}
        title={tag.name}
      >
        {tag.name}
      </span>
    </>
  )

  if (isStatic) {
    return (
      <span className={`${base} ${tone} ${interactive} ${className}`} title={tag.name}>
        {content}
      </span>
    )
  }

  return (
    <button
      type="button"
      data-tag-chip={measure ? '1' : undefined}
      tabIndex={measure ? -1 : 0}
      onClick={measure ? undefined : onClick}
      aria-pressed={selected}
      title={tag.name}
      className={`${base} ${tone} ${interactive} ${className}`}
    >
      {content}
    </button>
  )
}

export const moodTagMoreClassName =
  'inline-flex shrink-0 items-center rounded-full border border-dashed border-sky-400/35 ' +
  'bg-slate-900/85 px-2.5 py-1 text-[10px] sm:text-[11px] font-medium text-sky-200/95 ' +
  'backdrop-blur-sm transition-colors hover:border-sky-400/60 hover:text-white hover:bg-slate-800/90 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40'

/** Horizontal scroll row for mobile mood filters (touch-friendly, no horizontal page scroll). */
export const moodTagScrollRowClassName =
  'flex w-full gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain ' +
  'pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] ' +
  '[&::-webkit-scrollbar]:hidden snap-x snap-mandatory'
