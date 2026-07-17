import { MessageSquare, Trophy, X } from 'lucide-react'
import type { WorldCupTeamId } from '../lib/types'

interface PostDestinationChooserProps {
  open: boolean
  onClose: () => void
  canPostVent: boolean
  wcPostsToday: number
  wcMaxPosts: number
  wcTeamId?: WorldCupTeamId | null
  pickTeam: boolean
  onPickTeamChange: (picking: boolean) => void
  onChooseVent: () => void
  onChooseWorldCup: (teamId?: WorldCupTeamId) => void
  error?: string | null
}

/**
 * Sheet: Vent Wall vs World Cup Finals (then team if needed).
 * Render via createPortal(..., document.body) from the parent.
 */
export default function PostDestinationChooser({
  open,
  onClose,
  canPostVent,
  wcPostsToday,
  wcMaxPosts,
  wcTeamId,
  pickTeam,
  onPickTeamChange,
  onChooseVent,
  onChooseWorldCup,
  error,
}: PostDestinationChooserProps) {
  if (!open) return null

  const wcAtLimit = wcPostsToday >= wcMaxPosts
  const teamLabel =
    wcTeamId === 'spain' ? 'Spain' : wcTeamId === 'argentina' ? 'Argentina' : null

  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center p-4"
      role="presentation"
    >
      {/* Dimmer only — not a <button> covering the dialog */}
      <div
        className="absolute inset-0 bg-black/75"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-destination-title"
        className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-600 bg-slate-900 p-5 shadow-2xl text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 id="post-destination-title" className="text-base font-semibold text-white">
            {pickTeam ? 'Post for which team?' : 'Where do you want to post?'}
          </h2>
          <button
            type="button"
            className="p-1.5 rounded-full hover:bg-slate-700 shrink-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        {!pickTeam ? (
          <>
            <p className="text-xs text-slate-400 mb-4">
              Choose Vent Wall (moods) or World Cup Finals (Spain / Argentina).
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onChooseVent}
                disabled={!canPostVent}
                className="min-h-[48px] flex items-center gap-3 rounded-xl border border-slate-600
                  bg-slate-800 px-4 py-3 text-left text-sm font-medium text-white
                  hover:border-sky-400 hover:bg-slate-700 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageSquare className="w-5 h-5 text-sky-400 shrink-0" />
                <span className="min-w-0">
                  <span className="block">Vent Wall</span>
                  <span className="block text-[11px] font-normal text-slate-400">
                    {canPostVent ? 'Mood post · up to 3 per day' : 'Daily limit reached'}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onChooseWorldCup()}
                disabled={wcAtLimit}
                className="min-h-[48px] flex items-center gap-3 rounded-xl border border-slate-600
                  bg-slate-800 px-4 py-3 text-left text-sm font-medium text-white
                  hover:border-sky-400 hover:bg-slate-700 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trophy className="w-5 h-5 text-amber-300 shrink-0" />
                <span className="min-w-0">
                  <span className="block">World Cup Finals</span>
                  <span className="block text-[11px] font-normal text-slate-400">
                    {wcAtLimit
                      ? `Daily limit reached (${wcMaxPosts}/day)`
                      : teamLabel
                        ? `Post as ${teamLabel} fan · ${wcPostsToday}/${wcMaxPosts} today`
                        : `Spain or Argentina · up to ${wcMaxPosts}/day`}
                  </span>
                </span>
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-4">
              This casts your Finals vote if you have not voted yet. Votes cannot be changed.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="min-h-[44px] rounded-full bg-red-950 text-red-100 border border-red-700 font-medium text-sm hover:bg-red-900"
                onClick={() => onChooseWorldCup('spain')}
              >
                🇪🇸 Spain
              </button>
              <button
                type="button"
                className="min-h-[44px] rounded-full bg-sky-950 text-sky-100 border border-sky-600 font-medium text-sm hover:bg-sky-900"
                onClick={() => onChooseWorldCup('argentina')}
              >
                🇦🇷 Argentina
              </button>
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-white py-2"
                onClick={() => onPickTeamChange(false)}
              >
                ← Back
              </button>
            </div>
          </>
        )}

        {error ? (
          <p className="mt-3 text-xs text-amber-300 text-center" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
