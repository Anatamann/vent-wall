import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import { X } from 'lucide-react'
import { api } from '../../lib/api'
import type {
  WorldCupGlobeRegion,
  WorldCupRegionTally,
  WorldCupStats,
  WorldCupSupport,
  WorldCupTeamId,
} from '../../lib/types'
import LoadingSpinner from '../LoadingSpinner'
import ViewSwitcher from '../ViewSwitcher'
import Scoreboard from './Scoreboard'
import VotePills from './VotePills'

interface SupportGlobeProps {
  onViewChange: (view: 'wall' | 'globe') => void
  stats: WorldCupStats | null
  mySupport: WorldCupSupport | null
  voting?: boolean
  voteMessage?: string | null
  onVote: (teamId: WorldCupTeamId) => void
  /** Bump after a successful vote to reload region markers */
  regionsRefreshKey?: number
}

type HtmlPoint = WorldCupGlobeRegion & { size: number }

export default function SupportGlobe({
  onViewChange,
  stats,
  mySupport,
  voting = false,
  voteMessage = null,
  onVote,
  regionsRefreshKey = 0,
}: SupportGlobeProps) {
  const globeRef = useRef<any>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [regions, setRegions] = useState<WorldCupGlobeRegion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [tally, setTally] = useState<WorldCupRegionTally | null>(null)
  const [tallyLoading, setTallyLoading] = useState(false)
  const [tallyError, setTallyError] = useState<string | null>(null)
  const [popupOpen, setPopupOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    const quiet = regionsRefreshKey > 0
    ;(async () => {
      if (!quiet) setLoading(true)
      setError(null)
      try {
        const data = await api.worldcup.globeData()
        if (!cancelled) setRegions(data.regions)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load globe')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [regionsRefreshKey])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const update = () => {
      setDimensions({
        width: Math.max(320, el.clientWidth),
        height: Math.max(320, el.clientHeight),
      })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [loading])

  useEffect(() => {
    if (loading || error) return
    const globe = globeRef.current
    if (!globe) return
    globe.pointOfView({ lat: 15, lng: 10, altitude: 2.05 }, 0)
    const controls = globe.controls?.()
    if (controls) {
      controls.autoRotate = true
      controls.autoRotateSpeed = 0.28
      controls.enableDamping = true
    }
  }, [loading, error, regions.length, dimensions])

  const points: HtmlPoint[] = useMemo(
    () =>
      regions.map((r) => ({
        ...r,
        size: Math.min(1.35, 0.65 + Math.log10(r.total + 1) * 0.5),
      })),
    [regions]
  )

  const openTally = useCallback(async (region: WorldCupGlobeRegion) => {
    setPopupOpen(true)
    setTally(null)
    setTallyError(null)
    setTallyLoading(true)
    try {
      const data = await api.worldcup.regionTally(region.regionKey)
      setTally(data)
    } catch (err) {
      setTallyError(err instanceof Error ? err.message : 'Failed to load tally')
    } finally {
      setTallyLoading(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="globe-stage flex h-full w-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="globe-stage flex h-full w-full flex-col items-center justify-center gap-4 px-4">
        <p className="text-center text-sm text-red-400">{error}</p>
        <ViewSwitcher view="globe" onChange={onViewChange} variant="dark" wallLabel="Wall" globeLabel="Globe" />
      </div>
    )
  }

  return (
    <div
      ref={stageRef}
      className="globe-stage relative h-full w-full overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 70% 60% at 50% 42%, #1a2744 0%, #0b1224 55%, #070b14 100%)',
      }}
    >
      <div className="absolute inset-0 z-[2] flex items-center justify-center">
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          atmosphereColor="#7dd3fc"
          atmosphereAltitude={0.22}
          showAtmosphere
          htmlElementsData={points}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude={(d: object) => {
            const p = d as HtmlPoint
            return 0.022 + Math.min(0.05, p.total * 0.003)
          }}
          htmlElement={(d: object) => {
            const p = d as HtmlPoint
            const el = document.createElement('button')
            el.type = 'button'
            el.className = 'vent-globe-marker'
            el.setAttribute('aria-label', p.state || p.country || 'Region')
            const face = document.createElement('span')
            face.className = 'vent-globe-marker-face'
            face.textContent = p.leadingEmoji
            el.appendChild(face)
            el.title = `${p.state || p.country || 'Region'}: ${p.spainCount}–${p.argentinaCount}`
            const scale = 0.95 + p.size * 0.15
            el.style.setProperty('--marker-scale', String(scale))
            if (p.leadingTeamId === 'spain') {
              el.style.borderColor = 'rgba(198,11,30,0.6)'
            } else if (p.leadingTeamId === 'argentina') {
              el.style.borderColor = 'rgba(116,172,223,0.6)'
            }
            el.onclick = (e) => {
              e.stopPropagation()
              void openTally(p)
            }
            return el
          }}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center gap-2 px-3 pt-3 sm:pt-4">
        <div className="pointer-events-auto">
          <ViewSwitcher
            view="globe"
            onChange={onViewChange}
            variant="dark"
            wallLabel="Wall"
            globeLabel="Globe"
          />
        </div>
        <div className="pointer-events-auto w-full max-w-3xl">
          <Scoreboard stats={stats} />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[100] bg-gradient-to-t from-[#070b14] via-[#070b14]/92 to-transparent pt-16 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4">
        <div
          className="pointer-events-auto relative mx-auto w-full max-w-lg px-3 sm:px-4"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="rounded-2xl border border-white/10 bg-slate-900/85 backdrop-blur-xl px-3 py-3 sm:px-4 sm:py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
            <VotePills
              compact
              mySupport={mySupport}
              voting={voting}
              votingClosed={stats?.voting_closed}
              onVote={onVote}
              message={
                voteMessage ||
                (mySupport
                  ? undefined
                  : 'Tap a team to cast your vote · no login needed')
              }
            />
          </div>
          <p className="mt-2 text-center text-[10px] sm:text-[11px] text-slate-500 px-2">
            Click a region for tallies · leading team flag on the map · ISP approximate
          </p>
        </div>
      </div>

      {popupOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-md"
            aria-label="Close"
            onClick={() => setPopupOpen(false)}
          />
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/15
              bg-slate-900/75 backdrop-blur-2xl p-4 sm:p-6"
            style={{
              boxShadow: '0 0 0 1px rgba(125,211,252,0.08), 0 25px 80px rgba(0,0,0,0.55)',
            }}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base sm:text-xl font-semibold text-slate-50">
                  {tally?.label || 'Region'}
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  {tally
                    ? `${tally.total} supports · all-time`
                    : tallyLoading
                      ? 'Loading…'
                      : '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPopupOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {tallyLoading && (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            )}
            {tallyError && <p className="text-sm text-red-400">{tallyError}</p>}
            {tally && (
              <div className="space-y-4">
                {tally.teams.map((t) => (
                  <div key={t.id}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-slate-200">
                        {t.emoji} {t.name}
                      </span>
                      <span className="tabular-nums text-slate-100 font-medium">
                        {t.votes} · {t.percent}%
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(t.percent, t.votes > 0 ? 2 : 0)}%`,
                          backgroundColor: t.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-slate-400">
                  Leading:{' '}
                  {tally.total === 0
                    ? 'None yet'
                    : tally.isTied
                      ? 'Tied'
                      : tally.teams.find((t) => t.id === tally.leadingTeamId)?.name || '—'}
                  {!tally.isReliable && tally.total > 0 ? (
                    <span className="text-amber-300/90"> · Early sample</span>
                  ) : tally.isReliable ? (
                    <span> · Reliable sample</span>
                  ) : null}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
