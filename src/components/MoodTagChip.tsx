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
}: MoodTagChipProps) {
  const sizeClass =
    size === 'md'
      ? 'px-3 py-1.5 text-xs sm:text-sm gap-2'
      : 'px-2.5 py-1 text-[10px] sm:text-[11px] gap-1.5'

  const base =
    `inline-flex shrink-0 items-center rounded-full font-medium backdrop-blur-sm ` +
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
      <span className="opacity-90" aria-hidden>
        {tag.emoji}
      </span>
      <span className="whitespace-nowrap">{tag.name}</span>
    </>
  )

  if (isStatic) {
    return <span className={`${base} ${tone} ${interactive} ${className}`}>{content}</span>
  }

  return (
    <button
      type="button"
      data-tag-chip={measure ? '1' : undefined}
      tabIndex={measure ? -1 : 0}
      onClick={measure ? undefined : onClick}
      aria-pressed={selected}
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
