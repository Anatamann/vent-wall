import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, ApiError, setWorldCupBallotId } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import ViewSwitcher from '../components/ViewSwitcher'
import LoadingSpinner from '../components/LoadingSpinner'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [voteError, setVoteError] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)
  const [postModalTeam, setPostModalTeam] = useState<WorldCupTeamId | null>(null)
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
        // Re-click after geo backfill still refreshes the map
        setGlobeRefreshKey((k) => k + 1)
        const s = await api.worldcup.stats()
        setStats(s)
        const placed = payload?.placed as { label?: string } | null | undefined
        setVoteError(
          placed?.label
            ? `Already voted · shown on globe in ${placed.label}`
            : 'You already cast your support.'
        )
        window.setTimeout(() => setVoteError(null), 4500)
      } else {
        setVoteError(err instanceof Error ? err.message : 'Failed to vote')
      }
    } finally {
      setVoting(false)
    }
  }, [])

  const openPostFlow = (teamId: WorldCupTeamId) => {
    if (!isAuthenticated) {
      const next = `/worldcup?view=wall&support=${teamId}`
      window.location.href = `/auth?next=${encodeURIComponent(next)}`
      return
    }
    setPostModalTeam(teamId)
  }

  if (view === 'globe') {
    return (
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
        {postModalTeam && (
          <SupportPostModal
            isOpen={Boolean(postModalTeam)}
            teamId={postModalTeam}
            onClose={() => setPostModalTeam(null)}
            onPosted={() => void refresh()}
          />
        )}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col items-center gap-3">
        <ViewSwitcher
          view={view}
          onChange={handleViewChange}
          variant="dark"
          wallLabel="Support Wall"
          globeLabel="Support Globe"
        />
        <h1 className="text-xl sm:text-2xl font-bold text-slate-50 text-center">
          World Cup Finals 2026
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 text-center max-w-lg">
          Cast an anonymous vote for Spain or Argentina. Log in only if you want to post on the
          wall or comment.
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
        {mySupport && !mySupport.is_wall_post && (
          <p className="text-center text-xs text-slate-400">
            <button
              type="button"
              className="text-sky-400 hover:text-sky-300"
              onClick={() => openPostFlow(mySupport.team_id as WorldCupTeamId)}
            >
              Post on the wall
            </button>
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

      {postModalTeam && (
        <SupportPostModal
          isOpen={Boolean(postModalTeam)}
          teamId={postModalTeam}
          onClose={() => {
            setPostModalTeam(null)
            setSearchParams(
              (prev) => {
                const p = new URLSearchParams(prev)
                p.delete('support')
                return p
              },
              { replace: true }
            )
          }}
          onPosted={() => void refresh()}
        />
      )}
    </div>
  )
}
