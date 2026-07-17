import type { WorldCupTeam } from '../../lib/types'

interface TeamChipProps {
  team: Pick<WorldCupTeam, 'id' | 'name' | 'emoji' | 'color'>
  selected?: boolean
  onClick?: () => void
  static?: boolean
  className?: string
}

export default function TeamChip({
  team,
  selected = false,
  onClick,
  static: isStatic = false,
  className = '',
}: TeamChipProps) {
  const isSpain = team.id === 'spain'
  const isArgentina = team.id === 'argentina'
  const isAll = team.id === 'all'

  const base =
    'inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 ' +
    'text-[10px] sm:text-[11px] font-medium backdrop-blur-sm border transition-all ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40'

  let tone =
    'border-white/10 bg-slate-800/80 text-slate-200 hover:border-sky-400/30 hover:bg-slate-700/90'

  if (selected) {
    if (isSpain) {
      tone =
        'border-[rgba(198,11,30,0.55)] bg-worldcup-spain-soft text-worldcup-spain-text ' +
        'shadow-[0_0_12px_var(--wc-spain-glow)] scale-[1.02]'
    } else if (isArgentina) {
      tone =
        'border-[rgba(116,172,223,0.55)] bg-worldcup-argentina-soft text-worldcup-argentina-text ' +
        'shadow-[0_0_12px_var(--wc-argentina-glow)] scale-[1.02]'
    } else {
      tone =
        'border-sky-400/50 bg-sky-500/15 text-sky-100 shadow-[0_0_12px_rgba(56,189,248,0.2)] scale-[1.02]'
    }
  }

  const interactive = !isStatic
    ? 'cursor-pointer hover:scale-[1.03]'
    : 'cursor-default'

  const content = (
    <>
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: isAll ? '#38bdf8' : team.color }}
        aria-hidden
      />
      <span className="shrink-0" aria-hidden>
        {team.emoji}
      </span>
      <span className="min-w-0 truncate max-w-[7.5rem] sm:max-w-[10rem]">{team.name}</span>
    </>
  )

  if (isStatic) {
    return (
      <span className={`${base} ${tone} ${interactive} ${className}`} title={team.name}>
        {content}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      title={team.name}
      className={`${base} ${tone} ${interactive} ${className}`}
    >
      {content}
    </button>
  )
}

export const ALL_TEAM_FILTER = {
  id: 'all',
  name: 'All',
  emoji: '🌍',
  color: '#38bdf8',
} as const
