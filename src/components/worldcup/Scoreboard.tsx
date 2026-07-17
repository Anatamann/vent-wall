import type { WorldCupStats } from '../../lib/types'

interface ScoreboardProps {
  stats: WorldCupStats | null
  loading?: boolean
}

export default function Scoreboard({ stats, loading }: ScoreboardProps) {
  if (loading && !stats) {
    return (
      <div className="glass-panel p-3 sm:p-4 animate-pulse">
        <div className="h-8 rounded bg-slate-700/60" />
      </div>
    )
  }

  if (!stats) return null

  const spain = stats.teams.find((t) => t.id === 'spain')
  const argentina = stats.teams.find((t) => t.id === 'argentina')
  const spainVotes = spain?.votes ?? 0
  const argentinaVotes = argentina?.votes ?? 0
  const spainPct = spain?.percent ?? 0
  const argentinaPct = argentina?.percent ?? 0

  return (
    <div className="glass-panel p-3 sm:p-4" aria-live="polite">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0 sm:w-40">
          <span className="text-xs text-slate-400 truncate">
            {spain?.emoji} Spain
          </span>
          <span className="text-lg sm:text-2xl font-bold tabular-nums text-slate-50">
            {spainVotes.toLocaleString()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-[10px] sm:text-xs text-slate-400 mb-1">
            <span>{spainPct}%</span>
            <span className="text-slate-500">all-time</span>
            <span>{argentinaPct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-slate-800 flex">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${stats.total > 0 ? spainPct : 50}%`,
                backgroundColor: 'var(--wc-spain)',
              }}
            />
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${stats.total > 0 ? argentinaPct : 50}%`,
                backgroundColor: 'var(--wc-argentina)',
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 min-w-0 sm:w-44">
          <span className="text-lg sm:text-2xl font-bold tabular-nums text-slate-50 order-2 sm:order-1">
            {argentinaVotes.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400 truncate order-1 sm:order-2">
            Argentina {argentina?.emoji}
          </span>
        </div>
      </div>
      {stats.voting_closed && (
        <p className="mt-2 text-center text-[11px] text-amber-300/90">Voting is closed</p>
      )}
    </div>
  )
}
