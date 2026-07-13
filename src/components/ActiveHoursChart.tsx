import { useMemo } from 'react'

export type HourCount = { hour: number; count: number }

interface ActiveHoursChartProps {
  data: HourCount[]
  /** Chart height in px (plot area only). */
  height?: number
}

function formatHourShort(hour: number): string {
  if (hour === 0) return '12a'
  if (hour === 12) return '12p'
  if (hour < 12) return `${hour}a`
  return `${hour - 12}p`
}

function formatHourFull(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

/** Nice Y-axis max (ceil to 1/2/5 × 10^n). */
function niceMax(raw: number): number {
  if (raw <= 0) return 4
  const exp = Math.floor(Math.log10(raw))
  const base = 10 ** exp
  const n = raw / base
  let nice: number
  if (n <= 1) nice = 1
  else if (n <= 2) nice = 2
  else if (n <= 5) nice = 5
  else nice = 10
  return nice * base
}

function yTicks(max: number, count = 4): number[] {
  const ticks: number[] = []
  for (let i = 0; i <= count; i++) {
    ticks.push(Math.round((max * i) / count))
  }
  return [...new Set(ticks)]
}

/**
 * Column chart for peak vent hours — X = hour of day, Y = vent count.
 * Pure SVG (no chart library) to match glass UI and keep the bundle light.
 */
export default function ActiveHoursChart({ data, height = 220 }: ActiveHoursChartProps) {
  const series = useMemo(() => {
    const byHour = new Map(data.map((d) => [d.hour, d.count]))
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: byHour.get(hour) ?? 0,
    }))
  }, [data])

  const maxCount = Math.max(0, ...series.map((d) => d.count))
  const yMax = niceMax(maxCount)
  const ticks = yTicks(yMax, 4)

  // Layout (viewBox coordinates)
  const W = 720
  const H = height + 56
  const pad = { top: 28, right: 16, bottom: 44, left: 44 }
  const plotW = W - pad.left - pad.right
  const plotH = H - pad.top - pad.bottom
  const gap = 0.28
  const slot = plotW / 24
  const barW = slot * (1 - gap)

  const xFor = (i: number) => pad.left + i * slot + (slot - barW) / 2
  const yFor = (count: number) => pad.top + plotH - (count / yMax) * plotH
  const hFor = (count: number) => Math.max(count > 0 ? 2 : 0, (count / yMax) * plotH)

  // X labels: every 3 hours for readability
  const xLabelHours = [0, 3, 6, 9, 12, 15, 18, 21]

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[320px] h-auto select-none"
        role="img"
        aria-label="Column chart of vents by hour of day"
      >
        <defs>
          <linearGradient id="activeHoursBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="activeHoursBarMuted" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#64748b" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#475569" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {/* Plot background */}
        <rect
          x={pad.left}
          y={pad.top}
          width={plotW}
          height={plotH}
          rx={8}
          fill="rgba(15,23,42,0.45)"
          stroke="rgba(255,255,255,0.06)"
        />

        {/* Horizontal grid + Y ticks */}
        {ticks.map((t) => {
          const y = yFor(t)
          return (
            <g key={`y-${t}`}>
              <line
                x1={pad.left}
                x2={pad.left + plotW}
                y1={y}
                y2={y}
                stroke="rgba(148,163,184,0.15)"
                strokeDasharray={t === 0 ? undefined : '3 4'}
              />
              <text
                x={pad.left - 8}
                y={y + 3.5}
                textAnchor="end"
                className="fill-slate-400"
                fontSize="11"
                fontFamily="system-ui, sans-serif"
              >
                {t}
              </text>
            </g>
          )
        })}

        {/* Y-axis line */}
        <line
          x1={pad.left}
          x2={pad.left}
          y1={pad.top}
          y2={pad.top + plotH}
          stroke="rgba(148,163,184,0.35)"
          strokeWidth="1.25"
        />

        {/* X-axis line */}
        <line
          x1={pad.left}
          x2={pad.left + plotW}
          y1={pad.top + plotH}
          y2={pad.top + plotH}
          stroke="rgba(148,163,184,0.35)"
          strokeWidth="1.25"
        />

        {/* Y-axis label */}
        <text
          x={14}
          y={pad.top + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 14 ${pad.top + plotH / 2})`}
          className="fill-slate-400"
          fontSize="11"
          fontFamily="system-ui, sans-serif"
        >
          Vents
        </text>

        {/* Columns + value annotations */}
        {series.map((d, i) => {
          const x = xFor(i)
          const y = yFor(d.count)
          const h = hFor(d.count)
          const isPeak = d.count > 0 && d.count === maxCount
          const showValue = d.count > 0

          return (
            <g key={d.hour}>
              <title>
                {formatHourFull(d.hour)}: {d.count} vent{d.count === 1 ? '' : 's'}
              </title>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={3}
                fill={d.count === 0 ? 'url(#activeHoursBarMuted)' : 'url(#activeHoursBar)'}
                opacity={isPeak ? 1 : d.count === 0 ? 0.35 : 0.9}
                className="transition-opacity"
              />
              {isPeak && (
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx={3}
                  fill="none"
                  stroke="rgba(196,181,253,0.7)"
                  strokeWidth="1.25"
                />
              )}
              {showValue && (
                <text
                  x={x + barW / 2}
                  y={y - 6}
                  textAnchor="middle"
                  className={isPeak ? 'fill-violet-200' : 'fill-slate-300'}
                  fontSize="10"
                  fontWeight={isPeak ? 600 : 500}
                  fontFamily="system-ui, sans-serif"
                >
                  {d.count}
                </text>
              )}
            </g>
          )
        })}

        {/* X tick marks + labels */}
        {xLabelHours.map((hour) => {
          const i = hour
          const cx = pad.left + i * slot + slot / 2
          return (
            <g key={`x-${hour}`}>
              <line
                x1={cx}
                x2={cx}
                y1={pad.top + plotH}
                y2={pad.top + plotH + 5}
                stroke="rgba(148,163,184,0.4)"
              />
              <text
                x={cx}
                y={pad.top + plotH + 18}
                textAnchor="middle"
                className="fill-slate-400"
                fontSize="10"
                fontFamily="system-ui, sans-serif"
              >
                {formatHourShort(hour)}
              </text>
            </g>
          )
        })}

        {/* X-axis label */}
        <text
          x={pad.left + plotW / 2}
          y={H - 8}
          textAnchor="middle"
          className="fill-slate-400"
          fontSize="11"
          fontFamily="system-ui, sans-serif"
        >
          Hour of day
        </text>
      </svg>

      {maxCount === 0 && (
        <p className="text-center text-xs text-slate-500 -mt-2 pb-1">
          No vent activity in this period yet
        </p>
      )}
    </div>
  )
}
