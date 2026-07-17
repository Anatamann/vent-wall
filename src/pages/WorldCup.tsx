import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { api, ApiError, setWorldCupBallotId } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import ViewSwitcher from '../components/ViewSwitcher'
import LoadingSpinner from '../components/LoadingSpinner'
import FloatingPostButton from '../components/FloatingPostButton'
import TeamChip, { ALL_TEAM_FILTER } from '../components/worldcup/TeamChip'
import Scoreboard from '../components/worldcup/Scoreboard'
import SupportCard from '../components/worldcup/SupportCard'
import SupportPostModal from '../components/worldcup/SupportPostModal'
import SupportGlobeLazy from '../components/worldcup/SupportGlobeLazy'
import VotePills from '../components/worldcup/VotePills'
import type { WorldCupStats, WorldCupSupport, WorldCupTeamId } from '../lib/types'

type WcView = 'wall' | 'globe'
const DESKTOP_MIN = 1024

const TEAMS = {
  spain: { id: 'spain' as const, name: 'Spain', emoji: '🇪🇸', color: '#C60B1E' },
  argentina: {
    id: 'argentina' as const,
    name: 'Argentina',
    emoji: '🇦🇷',
    color: '#74ACDF',
  },
}

function defaultView(): WcView {
  if (typeof window === 'undefined') return 'wall'
  return window.matchMedia(`(min-width: ${DESKTOP_MIN}px)`).matches ? 'globe' : 'wall'
}

export default function WorldCup() {
  const { isAuthenticated } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState<WcView>(
    () => (searchParams.get('view') === 'globe' || searchParams.get('view') === 'wall'
      ? (searchParams.get('view') as WcView)
      : defaultView())
  )
  const [filter, setFilter] = useState<'all' | WorldCupTeamId>('all')
  const [supports, setSupports] = useState<WorldCupSupport[]>([])
  const [stats, setStats] = useState<WorldCupStats | null>(null)
  const [mySupport, setMySupport] = useState<WorldCupSupport | null>(null)
  const [wallPostsToday, setWallPostsToday] = useState(0)
  const [maxWallPostsPerDay, setMaxWallPostsPerDay] = useState(5)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [voteError, setVoteError] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)
  const [postModalTeam, setPostModalTeam] = useState<WorldCupTeamId | null>(null)
  const [pickTeamForPost, setPickTeamForPost] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [globeRefreshKey, setGlobeRefreshKey] = useState(0)

  useEffect(() => {
    const cls = view === 'globe' ? 'worldcup-globe-active' : 'worldcup-wall-active'
    document.body.classList.add(cls)
    return () => {
      document.body.classList.remove('worldcup-wall-active', 'worldcup-globe-active')
    }
  }, [view])

  const handleViewChange = useCallback(
    (next: WcView) => {
      setView(next)
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('view', next)
          return p
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const [list, s, me] = await Promise.all([
        api.worldcup.listSupports({
          team: filter === 'all' ? undefined : filter,
          limit: 40,
        }),
        api.worldcup.stats(),
        api.worldcup.me(),
      ])
      setSupports(list)
      setStats(s)
      setMySupport(me.support)
      setWallPostsToday(me.wall_posts_today ?? 0)
      setMaxWallPostsPerDay(me.max_wall_posts_per_day ?? 5)
      if (me.ballot_id) setWorldCupBallotId(me.ballot_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    setLoading(true)
    void refresh()
  }, [refresh])

  useEffect(() => {
    const id = window.setInterval(() => {
      void api.worldcup.stats().then(setStats).catch(() => undefined)
    }, 45000)
    return () => window.clearInterval(id)
  }, [])

  // Resume post flow after auth
  useEffect(() => {
    const support = searchParams.get('support')
    if (support === 'spain' || support === 'argentina') {
      if (isAuthenticated) {
        setPostModalTeam(support)
      }
    }
  }, [searchParams, isAuthenticated])

  const castVote = useCallback(async (teamId: WorldCupTeamId) => {
    setVoteError(null)
    setVoting(true)
    try {
      const result = await api.worldcup.vote({
        team_id: teamId,
        contribute_to_globe: true,
      })
      setMySupport(result.support)
      const teamName = teamId === 'spain' ? 'Spain' : 'Argentina'
      const place = result.placed?.label
      setToast(
        place
          ? `Support cast for ${teamName} · on the globe in ${place}`
          : `Support cast for ${teamName}!`
      )
      window.setTimeout(() => setToast(null), 4500)
      const s = await api.worldcup.stats()
      setStats(s)
      setGlobeRefreshKey((k) => k + 1)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const payload = (err as ApiError & { payload?: Record<string, unknown> }).payload
        if (payload?.support && typeof payload.support === 'object') {
          setMySupport(payload.support as WorldCupSupport)
        } else {
          const me = await api.worldcup.me()
          setMySupport(me.support)
        }
        if (typeof payload?.ballot_id === 'string') {
          setWorldCupBallotId(payload.ballot_id)
        }
        // Re-click after geo backfill still refreshes the map
        setGlobeRefreshKey((k) => k + 1)
        const s = await api.worldcup.stats()
        setStats(s)
        const serverMsg = typeof payload?.error === 'string' ? payload.error : null
        const placed = payload?.placed as { label?: string } | null | undefined
        setVoteError(
          serverMsg ||
            (placed?.label
              ? `Already voted · shown on globe in ${placed.label}`
              : 'You already cast your support. Registered votes cannot be changed.')
        )
        window.setTimeout(() => setVoteError(null), 5500)
      } else {
        setVoteError(err instanceof Error ? err.message : 'Failed to vote')
      }
    } finally {
      setVoting(false)
    }
  }, [])

  const openPostFlow = (teamId: WorldCupTeamId) => {
    setPickTeamForPost(false)
    if (!isAuthenticated) {
      const next = `/worldcup?view=${view}&support=${teamId}`
      window.location.href = `/auth?next=${encodeURIComponent(next)}`
      return
    }
    setPostModalTeam(teamId)
  }

  /** Floating + button — logged-in users post to the wall for their team. */
  const handleFloatingPost = () => {
    if (!isAuthenticated) {
      window.location.href = `/auth?next=${encodeURIComponent(`/worldcup?view=${view}`)}`
      return
    }
    if (wallPostsToday >= maxWallPostsPerDay) {
      setToast(
        `Daily World Cup wall limit reached (${maxWallPostsPerDay} posts). Try again tomorrow.`
      )
      window.setTimeout(() => setToast(null), 4500)
      return
    }
    if (mySupport?.team_id === 'spain' || mySupport?.team_id === 'argentina') {
      openPostFlow(mySupport.team_id)
      return
    }
    if (filter === 'spain' || filter === 'argentina') {
      openPostFlow(filter)
      return
    }
    setPickTeamForPost(true)
  }

  const closePostModal = () => {
    setPostModalTeam(null)
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.delete('support')
        return p
      },
      { replace: true }
    )
  }

  // Portal to body so FAB is never trapped under globe z-0 / main overflow stacking.
  const postChrome =
    typeof document !== 'undefined'
      ? createPortal(
          <>
            {isAuthenticated && (
              <FloatingPostButton
                onClick={handleFloatingPost}
                stacked
                disabled={wallPostsToday >= maxWallPostsPerDay}
                ariaLabel={
                  wallPostsToday >= maxWallPostsPerDay
                    ? `Daily wall limit reached (${maxWallPostsPerDay})`
                    : 'Post on World Cup wall'
                }
              />
            )}

            {pickTeamForPost && (
              <div
                className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-3 sm:p-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="wc-pick-team-title"
              >
                <button
                  type="button"
                  className="absolute inset-0 bg-slate-950/50 backdrop-blur-md"
                  aria-label="Close"
                  onClick={() => setPickTeamForPost(false)}
                />
                <div className="relative w-full max-w-sm rounded-2xl border border-white/15 bg-slate-900/90 backdrop-blur-2xl p-5 shadow-2xl">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h2 id="wc-pick-team-title" className="text-base font-semibold text-slate-50">
                      Post for which team?
                    </h2>
                    <button
                      type="button"
                      className="p-1.5 rounded-full hover:bg-white/10"
                      onClick={() => setPickTeamForPost(false)}
                      aria-label="Close"
                    >
                      <X className="w-5 h-5 text-slate-300" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    This also casts your vote if you have not voted yet. Votes cannot be changed.
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      className="min-h-[44px] rounded-full bg-worldcup-spain-soft text-worldcup-spain-text border border-[rgba(198,11,30,0.45)] font-medium text-sm"
                      onClick={() => openPostFlow('spain')}
                    >
                      🇪🇸 Spain
                    </button>
                    <button
                      type="button"
                      className="min-h-[44px] rounded-full bg-worldcup-argentina-soft text-worldcup-argentina-text border border-[rgba(116,172,223,0.45)] font-medium text-sm"
                      onClick={() => openPostFlow('argentina')}
                    >
                      🇦🇷 Argentina
                    </button>
                  </div>
                </div>
              </div>
            )}

            {postModalTeam && (
              <SupportPostModal
                isOpen={Boolean(postModalTeam)}
                teamId={postModalTeam}
                onClose={closePostModal}
                onPosted={() => {
                  void refresh()
                  setGlobeRefreshKey((k) => k + 1)
                }}
              />
            )}

            {toast && (
              <p className="pointer-events-none fixed bottom-24 right-4 z-[105] max-w-xs rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 shadow-lg sm:bottom-28">
                {toast}
              </p>
            )}
          </>,
          document.body
        )
      : null

  if (view === 'globe') {
    return (
      <>
        <div className="fixed inset-x-0 bottom-0 top-14 sm:top-16 z-0">
          <SupportGlobeLazy
            onViewChange={handleViewChange}
            stats={stats}
            mySupport={mySupport}
            voting={voting}
            voteMessage={voteError || toast}
            onVote={(teamId) => void castVote(teamId)}
            regionsRefreshKey={globeRefreshKey}
          />
        </div>
        {postChrome}
      </>
    )
  }

  return (
    <>
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col items-center gap-3">
        <ViewSwitcher
          view={view}
          onChange={handleViewChange}
          variant="dark"
          wallLabel="Wall"
          globeLabel="Globe"
        />
        <h1 className="text-xl sm:text-2xl font-bold text-slate-50 text-center">
          World Cup Finals 2026
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 text-center max-w-lg">
          Vote for Spain or Argentina. Logged-in votes are bound to your account forever and cannot
          be changed. Log in also unlocks wall posts and comments.
        </p>
      </div>

      <Scoreboard stats={stats} loading={loading && !stats} />

      {/* Support CTAs vs filters */}
      <div className="glass-panel p-3 sm:p-4 space-y-3">
        <VotePills
          mySupport={mySupport}
          voting={voting}
          votingClosed={stats?.voting_closed}
          onVote={(teamId) => void castVote(teamId)}
          message={voteError || toast}
        />
        {isAuthenticated && wallPostsToday < maxWallPostsPerDay && (
          <p className="text-center text-xs text-slate-400">
            <button
              type="button"
              className="text-sky-400 hover:text-sky-300"
              onClick={handleFloatingPost}
            >
              Post on the wall
              {wallPostsToday > 0
                ? ` (${wallPostsToday}/${maxWallPostsPerDay} today)`
                : ` (up to ${maxWallPostsPerDay}/day)`}
            </button>
          </p>
        )}
        {isAuthenticated && wallPostsToday >= maxWallPostsPerDay && (
          <p className="text-center text-xs text-amber-300/90">
            Daily wall limit reached ({maxWallPostsPerDay} posts). Try again tomorrow.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] sm:text-xs text-slate-500 mr-1">Filter</span>
        <TeamChip
          team={ALL_TEAM_FILTER}
          selected={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        <TeamChip
          team={TEAMS.spain}
          selected={filter === 'spain'}
          onClick={() => setFilter('spain')}
        />
        <TeamChip
          team={TEAMS.argentina}
          selected={filter === 'argentina'}
          onClick={() => setFilter('argentina')}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="glass-panel p-6 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <button type="button" className="btn-glass mt-3" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      ) : supports.length === 0 ? (
        <div className="glass-panel p-6 text-center space-y-3">
          <p className="text-slate-400 text-sm">
            {filter === 'all'
              ? 'No wall posts yet. Cast a vote, then post your support.'
              : `No ${filter === 'spain' ? 'Spain' : 'Argentina'} supporters on the wall yet.`}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className="btn-glass" onClick={() => openPostFlow('spain')}>
              Post for Spain
            </button>
            <button type="button" className="btn-glass" onClick={() => openPostFlow('argentina')}>
              Post for Argentina
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {supports.map((s) => (
            <SupportCard key={s.id} support={s} onUpdated={() => void refresh()} />
          ))}
        </div>
      )}

    </div>
    {postChrome}
    </>
  )
}
