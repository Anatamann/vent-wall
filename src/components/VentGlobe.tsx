import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import { api } from '../lib/api'
import { useMoodTags } from '../hooks/useMoodTags'
import type { GlobeRegionPoint, GlobeVentSummary, MoodTag } from '../lib/types'
import LoadingSpinner from './LoadingSpinner'
import GlobePopup, { type GlobePopupContext } from './GlobePopup'

interface VentGlobeProps {
  hours?: number
}

type HtmlPoint = GlobeRegionPoint & {
  size: number
}

const VISIBLE_MOOD_COUNT = 18

export default function VentGlobe({ hours = 24 }: VentGlobeProps) {
  const globeRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { tags, loading: tagsLoading } = useMoodTags()

  const [regions, setRegions] = useState<GlobeRegionPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState({ width: 900, height: 560 })
  const [showAllMoods, setShowAllMoods] = useState(false)

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

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const update = () => {
      const width = el.clientWidth || 900
      // Large, centered globe — primary explorative element (concept UI)
      const height = Math.max(480, Math.min(620, Math.round(width * 0.58)))
      setDimensions({ width, height })
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (loading) return
    const globe = globeRef.current
    if (!globe) return

    // Concept: Africa/Europe-ish focus, gentle auto-rotate
    globe.pointOfView({ lat: 15, lng: 10, altitude: 2.15 }, 0)
    const controls = globe.controls?.()
    if (controls) {
      controls.autoRotate = true
      controls.autoRotateSpeed = 0.28
      controls.enableDamping = true
      controls.minDistance = 120
      controls.maxDistance = 450
    }
  }, [loading, regions.length])

  const points: HtmlPoint[] = useMemo(
    () =>
      regions.map((r) => ({
        ...r,
        size: r.isEmpty ? 0.5 : Math.min(1.35, 0.65 + Math.log10(r.totalVents + 1) * 0.5),
      })),
    [regions]
  )

  const visibleTags: MoodTag[] = useMemo(() => {
    if (showAllMoods) return tags
    return tags.slice(0, VISIBLE_MOOD_COUNT)
  }, [tags, showAllMoods])

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
        title: tag ? `${tag.emoji} ${tag.name}` : 'Mood',
        subtitle: 'Vents with this mood from all regions (last 24 hours)',
        emoticon: tag?.emoji,
        accentColor: tag?.color,
      })
      setPopupOpen(true)
      setPopupLoading(true)
      setPopupError(null)
      setPopupVents([])

      try {
        const data = await api.globe.moodVents(tagId, hours)
        setPopupContext({
          title: data.tagName ? `${data.tagEmoji || ''} ${data.tagName}`.trim() : 'Mood',
          subtitle: `${data.vents.length} vent${data.vents.length === 1 ? '' : 's'} worldwide · last 24 hours`,
          emoticon: data.tagEmoji,
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
      <div className="flex justify-center items-center py-28">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="relative -mx-1 sm:mx-0">
      {/* Immersive stage — matches concept dark canvas */}
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden rounded-2xl sm:rounded-3xl ${
          popupOpen ? 'opacity-80' : ''
        }`}
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 45%, #1a2744 0%, #0b1224 55%, #070b14 100%)',
          boxShadow: 'inset 0 0 80px rgba(15, 23, 42, 0.6)',
        }}
      >
        {/* Soft vignette */}
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              'radial-gradient(circle at 50% 48%, transparent 28%, rgba(7,11,20,0.55) 78%)',
          }}
        />

        <div className="relative z-[2] flex justify-center">
          <Globe
            ref={globeRef}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="rgba(0,0,0,0)"
            // Muted blue-gray globe (closer to concept than photo-marble)
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

        <p className="relative z-[2] pb-5 -mt-2 text-center text-[11px] sm:text-xs tracking-wide text-slate-400/90">
          Drag to rotate · Scroll to zoom
        </p>
      </div>

      {/* Bottom mood capsules — concept-style dark pills + colored dots */}
      <div className="mt-5 sm:mt-6 px-1">
        {tagsLoading ? (
          <div className="flex flex-wrap justify-center gap-2">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="h-8 rounded-full bg-slate-800/80 animate-pulse"
                style={{ width: `${72 + (i % 4) * 16}px` }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-2 max-w-5xl mx-auto">
            {visibleTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => void openMoodPopup(tag.id)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium
                  bg-slate-800/70 hover:bg-slate-700/90 border border-white/10 text-slate-200
                  transition-all hover:scale-[1.03] hover:border-sky-400/30 hover:shadow-[0_0_12px_rgba(56,189,248,0.15)]
                  shrink-0"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_6px_currentColor]"
                  style={{ backgroundColor: tag.color, color: tag.color }}
                  aria-hidden
                />
                <span className="opacity-90">{tag.emoji}</span>
                <span>{tag.name}</span>
              </button>
            ))}

            {tags.length > VISIBLE_MOOD_COUNT && (
              <button
                type="button"
                onClick={() => setShowAllMoods((v) => !v)}
                className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium
                  bg-slate-900/80 border border-dashed border-white/20 text-slate-300
                  hover:border-sky-400/40 hover:text-white transition-colors shrink-0"
              >
                {showAllMoods ? 'Show less' : `+ more`}
              </button>
            )}
          </div>
        )}

        <p className="mt-3 text-center text-[10px] sm:text-[11px] text-slate-500">
          Last {hours}h · approximate ISP region · click a mood or a marker
        </p>
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
