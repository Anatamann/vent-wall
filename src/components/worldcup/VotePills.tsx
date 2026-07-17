import type { WorldCupSupport, WorldCupTeamId } from '../../lib/types'

interface VotePillsProps {
  mySupport: WorldCupSupport | null
  voting?: boolean
  votingClosed?: boolean
  onVote: (teamId: WorldCupTeamId) => void
  /** Compact row for globe chrome */
  compact?: boolean
  className?: string
  message?: string | null
}

/**
 * Clickable Support Spain / Support Argentina CTAs.
 * Distinct from filter chips — these cast a vote.
 */
export default function VotePills({
  mySupport,
  voting = false,
  votingClosed = false,
  onVote,
  compact = false,
  className = '',
  message,
}: VotePillsProps) {
  const disabled = voting || Boolean(mySupport) || votingClosed
  const votedSpain = mySupport?.team_id === 'spain'
  const votedArgentina = mySupport?.team_id === 'argentina'

  const basePill =
    'min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-full font-medium ' +
    'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40 ' +
    'disabled:cursor-not-allowed disabled:opacity-50 ' +
    (compact ? 'px-3.5 py-2 text-xs sm:text-sm' : 'px-5 py-2.5 text-sm flex-1 sm:flex-none')

  return (
    <div className={`space-y-2 ${className}`}>
      <div
        className={`flex ${compact ? 'flex-row flex-wrap justify-center gap-2' : 'flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-center'}`}
        role="group"
        aria-label="Cast your support"
      >
        <button
          type="button"
          disabled={disabled && !votedSpain}
          aria-pressed={votedSpain}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!disabled) onVote('spain')
          }}
          className={`${basePill} bg-worldcup-spain-soft text-worldcup-spain-text border border-[rgba(198,11,30,0.45)]
            hover:enabled:bg-[rgba(198,11,30,0.28)] hover:enabled:scale-[1.02]
            ${votedSpain ? 'ring-2 ring-[rgba(198,11,30,0.55)] shadow-[0_0_14px_var(--wc-spain-glow)] opacity-100' : ''}`}
        >
          <span aria-hidden>🇪🇸</span>
          <span>{votedSpain ? 'You support Spain' : 'Support Spain'}</span>
        </button>
        <button
          type="button"
          disabled={disabled && !votedArgentina}
          aria-pressed={votedArgentina}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!disabled) onVote('argentina')
          }}
          className={`${basePill} bg-worldcup-argentina-soft text-worldcup-argentina-text border border-[rgba(116,172,223,0.45)]
            hover:enabled:bg-[rgba(116,172,223,0.28)] hover:enabled:scale-[1.02]
            ${votedArgentina ? 'ring-2 ring-[rgba(116,172,223,0.55)] shadow-[0_0_14px_var(--wc-argentina-glow)] opacity-100' : ''}`}
        >
          <span aria-hidden>🇦🇷</span>
          <span>{votedArgentina ? 'You support Argentina' : 'Support Argentina'}</span>
        </button>
      </div>
      {message ? (
        <p className="text-center text-[11px] sm:text-xs text-slate-400">{message}</p>
      ) : votingClosed ? (
        <p className="text-center text-[11px] text-amber-300/90">Voting is closed</p>
      ) : mySupport ? (
        <p className="text-center text-[11px] text-slate-500">
          {mySupport.user?.id
            ? 'Registered vote is locked to your account and cannot be changed.'
            : 'Your vote is locked on this device. Sign in to bind it to your account permanently.'}
        </p>
      ) : null}
    </div>
  )
}
