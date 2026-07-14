import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import { api } from '../lib/api'
import { useMoodTags } from '../hooks/useMoodTags'
import type { GlobeRegionPoint, GlobeVentSummary } from '../lib/types'
import LoadingSpinner from './LoadingSpinner'
import GlobePopup, { type GlobePopupContext } from './GlobePopup'
import ViewSwitcher from './ViewSwitcher'
import GlobeMoodFilters from './GlobeMoodFilters'

interface VentGlobeProps {
  hours?: number
  onViewChange: (view: 'wall' | 'globe') => void
}

type HtmlPoint = GlobeRegionPoint & {
  size: number
}

export default function VentGlobe({ hours = 24, onViewChange }: VentGlobeProps) {
  const globeRef = useRef<any>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const { tags, loading: tagsLoading } = useMoodTags()

  const [regions, setRegions] = useState<GlobeRegionPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  const [popupOpen, setPopupOpen] = useState(false)
  const [popupContext, setPopupContext] = useState<GlobePopupContext | null>(null)
  const [popupVents, setPopupVents] = useState<GlobeVentSummary[]>([])
  const [popupLoading, setPopupLoading] = useState(false)
  const [popupError, setPopupError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await api.globe.data(hours)
        if (!cancelled) setRegions(data.regions)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load globe data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hours])

  // Fill the entire stage (full viewport width × remaining height under header)
  useEffect(() => {
    const el = stageRef.current
    if (!el) return

    const update = () => {
      const width = Math.max(320, el.clientWidth)
      const height = Math.max(320, el.clientHeight)
      setDimensions({ width, height })
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
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
      controls.minDistance = 100
      controls.maxDistance = 500
    }
  }, [loading, error, regions.length, dimensions.width, dimensions.height])

  const points: HtmlPoint[] = useMemo(
    () =>
      regions.map((r) => ({
        ...r,
        size: r.isEmpty ? 0.5 : Math.min(1.35, 0.65 + Math.log10(r.totalVents + 1) * 0.5),
      })),
    [regions]
  )

  const openRegionPopup = useCallback(
    async (region: GlobeRegionPoint) => {
      if (region.isEmpty) {
        setPopupContext({
          title: region.state || region.country || 'Region',
          subtitle: 'No vents from this region in the last 24 hours',
          emoticon: region.dominatingEmoticon,
        })
        setPopupVents([])
        setPopupError(null)
        setPopupLoading(false)
        setPopupOpen(true)
        return
      }

      const title = [region.state, region.country].filter(Boolean).join(', ') || region.regionKey
      setPopupContext({
        title,
        subtitle: `${region.totalVents} vent${region.totalVents === 1 ? '' : 's'} · ${region.totalEngagement} engagement${
          region.isReliable ? '' : ' · early sample'
        }`,
        emoticon: region.dominatingEmoticon,
        accentColor: region.dominatingTagColor,
      })
      setPopupOpen(true)
      setPopupLoading(true)
      setPopupError(null)
      setPopupVents([])

      try {
        const data = await api.globe.regionVents(region.regionKey, hours)
        setPopupVents(data.vents)
      } catch (err) {
        setPopupError(err instanceof Error ? err.message : 'Failed to load vents')
      } finally {
        setPopupLoading(false)
      }
    },
    [hours]
  )

  const openMoodPopup = useCallback(
    async (tagId: string) => {
      const tag = tags.find((t) => t.id === tagId)
      setPopupContext({
        title: tag?.name || 'Mood',
        subtitle: 'All on-Wall vents with this mood (last 24 hours), including those without a map location',
        emoticon: tag?.emoji || null,
        accentColor: tag?.color,
      })
      setPopupOpen(true)
      setPopupLoading(true)
      setPopupError(null)
      setPopupVents([])

      try {
        const data = await api.globe.moodVents(tagId, hours)
        setPopupContext({
          title: data.tagName || 'Mood',
          subtitle: `${data.vents.length} vent${data.vents.length === 1 ? '' : 's'} on the Wall · last ${hours}h · map location not required`,
          emoticon: data.tagEmoji || null,
          accentColor: data.tagColor,
        })
        setPopupVents(data.vents)
      } catch (err) {
        setPopupError(err instanceof Error ? err.message : 'Failed to load vents')
      } finally {
        setPopupLoading(false)
      }
    },
    [hours, tags]
  )

  const closePopup = () => {
    setPopupOpen(false)
    setPopupContext(null)
    setPopupVents([])
    setPopupError(null)
  }

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
        <ViewSwitcher view="globe" onChange={onViewChange} variant="dark" />
      </div>
    )
  }

  return (
    <div
      ref={stageRef}
      className={`globe-stage relative h-full w-full overflow-hidden ${popupOpen ? 'opacity-90' : ''}`}
      style={{
        background:
          'radial-gradient(ellipse 70% 60% at 50% 42%, #1a2744 0%, #0b1224 55%, #070b14 100%)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, transparent 30%, rgba(7,11,20,0.5) 80%)',
        }}
      />

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
            return p.isEmpty ? 0.012 : 0.022 + Math.min(0.05, p.totalVents * 0.003)
          }}
          htmlElement={(d: object) => {
            const p = d as HtmlPoint
            const el = document.createElement('button')
            el.type = 'button'
            el.className = 'vent-globe-marker'
            el.setAttribute('aria-label', p.state || p.country || 'Region')

            const face = document.createElement('span')
            face.className = 'vent-globe-marker-face'
            face.textContent = p.dominatingEmoticon
            el.appendChild(face)

            el.title = p.isEmpty
              ? `${p.state || p.country || 'Region'} · quiet`
              : `${p.state || p.country || 'Region'}: ${p.dominatingTagName || 'mood'} (${p.totalVents})`

            const scale = p.isEmpty ? 0.85 : 0.95 + p.size * 0.15
            el.style.setProperty('--marker-scale', String(scale))
            if (p.isEmpty) {
              el.classList.add('vent-globe-marker--empty')
            }

            el.onclick = (e) => {
              e.stopPropagation()
              void openRegionPopup(p)
            }
            return el
          }}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-3 pt-3 sm:pt-4">
        <div className="pointer-events-auto">
          <ViewSwitcher view="globe" onChange={onViewChange} variant="dark" />
        </div>
      </div>

      {/* Bottom: mood tags — mobile swipes; sm+ multi-row + “+N more” */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#070b14] via-[#070b14]/92 to-transparent pt-14 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4">
        <p className="mb-2 text-center text-[11px] sm:text-xs tracking-wide text-slate-400/90 px-2">
          <span className="sm:hidden">Drag to rotate · Pinch zoom</span>
          <span className="hidden sm:inline">Drag to rotate · Scroll to zoom</span>
        </p>

        <div className="pointer-events-auto w-full min-w-0 px-2 sm:px-4 lg:px-6">
          <GlobeMoodFilters
            tags={tags}
            loading={tagsLoading}
            onSelect={(tagId) => void openMoodPopup(tagId)}
          />

          <p className="mt-1.5 px-2 text-center text-[9px] sm:text-[10px] leading-snug text-slate-500">
            Last {hours}h · ISP region approximate · contribute only if you opt in · never exact position
          </p>
        </div>
      </div>

      <GlobePopup
        open={popupOpen}
        context={popupContext}
        vents={popupVents}
        loading={popupLoading}
        error={popupError}
        onClose={closePopup}
      />
    </div>
  )
}
