import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import type { WorldCupSupport } from '../../lib/types'
import TeamChip from './TeamChip'
import SupportCard from './SupportCard'
import LoadingSpinner from '../LoadingSpinner'

interface ProfileWorldCupSectionProps {
  support: WorldCupSupport | null
  wallPosts: WorldCupSupport[]
  loading?: boolean
  voteBoundToAccount?: boolean
}

const TEAMS = {
  spain: { id: 'spain' as const, name: 'Spain', emoji: '🇪🇸', color: '#C60B1E' },
  argentina: {
    id: 'argentina' as const,
    name: 'Argentina',
    emoji: '🇦🇷',
    color: '#74ACDF',
  },
}

/**
 * Profile block: locked Finals team + the user’s World Cup wall posts.
 */
export default function ProfileWorldCupSection({
  support,
  wallPosts,
  loading = false,
  voteBoundToAccount = false,
}: ProfileWorldCupSectionProps) {
  if (loading) {
    return (
      <section className="glass-panel p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-sky-400" />
          <h2 className="text-base sm:text-lg font-semibold text-slate-100">
            World Cup Finals 2026
          </h2>
        </div>
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      </section>
    )
  }

  const teamId = support?.team_id
  const team =
    teamId === 'spain' || teamId === 'argentina' ? TEAMS[teamId] : null

  const posts = wallPosts.filter((p) => p.is_wall_post)

  return (
    <section className="glass-panel p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Trophy className="w-5 h-5 text-sky-400 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-slate-100">
              World Cup Finals 2026
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Your support and wall posts
            </p>
          </div>
        </div>
        <Link
          to="/worldcup"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
            border border-white/10 bg-slate-800/70 text-sky-300
            hover:border-sky-400/30 hover:bg-slate-700/80 transition-colors shrink-0"
        >
          Open Finals
        </Link>
      </div>

      {/* Supported team */}
      <div
        className={`rounded-xl border p-4 ${
          teamId === 'spain'
            ? 'border-[rgba(198,11,30,0.35)] bg-worldcup-spain-soft/40'
            : teamId === 'argentina'
              ? 'border-[rgba(116,172,223,0.35)] bg-worldcup-argentina-soft/40'
              : 'border-white/10 bg-slate-800/40'
        }`}
      >
        {team ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl sm:text-4xl" aria-hidden>
              {team.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                You support
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <TeamChip team={team} selected static />
                {voteBoundToAccount && (
                  <span className="text-[10px] sm:text-[11px] text-slate-400 rounded-full border border-white/10 px-2 py-0.5">
                    Locked to your account
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Registered votes cannot be changed.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center sm:text-left space-y-2">
            <p className="text-sm text-slate-300">You haven’t cast a Finals vote yet.</p>
            <Link
              to="/worldcup"
              className="inline-flex text-sm font-medium text-sky-400 hover:text-sky-300"
            >
              Support Spain or Argentina →
            </Link>
          </div>
        )}
      </div>

      {/* Wall posts */}
      <div>
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-slate-200">Your Finals posts</h3>
          <span className="text-[11px] text-slate-500 tabular-nums">
            {posts.length} post{posts.length === 1 ? '' : 's'}
          </span>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-slate-900/30 px-4 py-6 text-center">
            <p className="text-sm text-slate-400 mb-2">No wall posts yet.</p>
            {team ? (
              <Link
                to={`/worldcup?view=wall&support=${team.id}`}
                className="text-sm font-medium text-sky-400 hover:text-sky-300"
              >
                Share a thought or GIF on the wall →
              </Link>
            ) : (
              <Link
                to="/worldcup?view=wall"
                className="text-sm font-medium text-sky-400 hover:text-sky-300"
              >
                Vote, then post on the wall →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {posts.map((post) => (
              <SupportCard key={post.id} support={post} hideComments />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
