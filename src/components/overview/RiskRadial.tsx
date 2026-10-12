import { useMemo } from 'react'
import { SCORE_CRITICAL, SCORE_WARNING, SENSOR_META, SENSOR_ORDER } from '../../lib/evaluate'
import type { HistoryPoint, SensorId, StatusLevel, TelemetrySnapshot } from '../../types/telemetry'

/**
 * Radial risk map.
 *
 * Every dot is one recent reading. Each sensor owns a quarter of the circle
 * (oldest → newest clockwise) and the dot's distance from the centre encodes
 * its risk: the outer ring is normal, the inner ring critical. The newest
 * reading of each sensor carries a label.
 *
 * Live readings have no 0–100 score (the sensors are on/off), so they sit in
 * the middle of their status band. Sensors without data draw no dots.
 */

const C = 200
const OUTER = 184
const RINGS: { r: number; label: string }[] = [
  { r: 84, label: 'CRITICAL' },
  { r: 128, label: 'WARNING' },
  { r: 172, label: 'NORMAL' },
]

/** Start angle (degrees, 0 = up, clockwise) and span of each sensor's sector. */
const SECTOR: Record<SensorId, [number, number]> = {
  fire: [237, 78], // ends top-left
  flood: [327, 78], // ends top-right
  air: [57, 78], // ends bottom-right
  temperature: [147, 78], // ends bottom-left
}

const SHORT: Record<SensorId, string> = { fire: 'Fire', flood: 'Flood', air: 'Air', temperature: 'Temp' }

/** Score → radius, continuous across the three bands. */
function radiusFor(score: number): number {
  if (score >= SCORE_CRITICAL) return 80 - ((score - SCORE_CRITICAL) / (100 - SCORE_CRITICAL)) * 34 // 80 → 46
  if (score >= SCORE_WARNING) return 124 - ((score - SCORE_WARNING) / (SCORE_CRITICAL - SCORE_WARNING)) * 36 // 124 → 88
  return 168 - (score / SCORE_WARNING) * 36 // 168 → 132
}

/** Centre of each band, for readings that only have a level. */
const BAND_RADIUS: Record<StatusLevel, number> = { safe: 150, warning: 106, critical: 63 }

/** Small deterministic jitter so dots spread like a scatter, not a line. */
const jitter = (i: number, s: number) => {
  const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453
  return (x - Math.floor(x) - 0.5) * 2
}

function polar(angleDeg: number, r: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return [C + r * Math.cos(a), C + r * Math.sin(a)]
}

const DOT_FILL: Record<StatusLevel, string> = {
  safe: '#ffffff',
  warning: 'var(--color-warn)',
  critical: 'var(--color-crit)',
}

interface Dot {
  key: string
  x: number
  y: number
  level: StatusLevel
  opacity: number
}

function buildDots(history: HistoryPoint[]): Dot[] {
  const n = history.length
  const dots: Dot[] = []
  history.forEach((p, i) => {
    SENSOR_ORDER.forEach((id, s) => {
      const point = p.sensors[id]
      if (point.level === null) return
      const [start, span] = SECTOR[id]
      const angle = start + ((i + 0.5) / n) * span + jitter(i, s + 7) * 1.2
      const base = point.score === null ? BAND_RADIUS[point.level] : radiusFor(point.score)
      const r = base + jitter(i, s) * (point.score === null ? 9 : 5)
      const [x, y] = polar(angle, r)
      const age = i / Math.max(1, n - 1)
      const level = point.level
      dots.push({ key: `${s}-${i}`, x, y, level, opacity: level === 'safe' ? 0.1 + 0.3 * age : 0.45 + 0.55 * age })
    })
  })
  return dots
}

export function RiskRadial({ snapshot }: { snapshot: TelemetrySnapshot }) {
  const { history, sensors } = snapshot
  // Dots only change when a new sample arrives.
  const dots = useMemo(() => buildDots(history), [history])
  const total = dots.length
  const span = history.length > 1 ? history[history.length - 1].t - history[0].t : 0
  const caption = snapshot.mode === 'live' && span < 110_000 ? 'THIS SESSION' : 'LAST 2 MINUTES'

  const callouts = SENSOR_ORDER.map((id) => {
    const st = sensors[id]
    const [start, span] = SECTOR[id]
    const angle = start + span
    const r = !st.available ? BAND_RADIUS.safe + 14 : st.score === null ? BAND_RADIUS[st.level] : radiusFor(st.score)
    const [x, y] = polar(angle, r)
    const right = x >= C
    const text = `${SHORT[id]}`
    const value = st.short
    const width = 16 + text.length * 6.4 + value.length * 6.2 + 6
    const lx = right ? x + 10 : x - 10 - width
    const ly = y - 11
    return { id, x, y, lx, ly, width, text, value, level: st.level, available: st.available }
  })

  return (
    <svg
      viewBox="-56 0 512 400"
      className="block h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Radial risk map of ${total} recent readings. ${SENSOR_ORDER.map(
        (id) => `${SENSOR_META[id].name} ${sensors[id].label}${sensors[id].available ? `, ${sensors[id].display} ${sensors[id].unit}` : ''}`,
      ).join('; ')}.`}
    >
      {/* Outer dashed boundary with small markers */}
      <circle cx={C} cy={C} r={OUTER} fill="none" stroke="var(--color-night-line)" strokeDasharray="2 5" />
      {Array.from({ length: 24 }, (_, k) => {
        const [x, y] = polar(k * 15 + 7.5, OUTER)
        return <circle key={k} cx={x} cy={y} r={2.6} fill="var(--color-night)" stroke="#3b4657" strokeWidth={1} />
      })}
      <text x={C} y={10} textAnchor="middle" fill="#7d8896" fontSize={8.5} letterSpacing={1.4}>
        {caption}
      </text>

      {/* Band rings */}
      {RINGS.map((ring) => (
        <g key={ring.label}>
          <circle cx={C} cy={C} r={ring.r} fill="none" stroke="#ffffff" strokeOpacity={0.07} />
          <text x={C} y={C - ring.r + 12} textAnchor="middle" fill="#6b7685" fontSize={7.5} letterSpacing={1.2}>
            {ring.label}
          </text>
        </g>
      ))}

      {/* Readings */}
      {dots.map((d) => (
        <circle
          key={d.key}
          cx={d.x}
          cy={d.y}
          r={d.level === 'safe' ? 2.3 : 2.8}
          fill={DOT_FILL[d.level]}
          fillOpacity={d.opacity}
        />
      ))}

      {/* Centre */}
      <circle cx={C} cy={C} r={34} fill="var(--color-night-2)" stroke="#2c3646" />
      <text x={C} y={C - 1} textAnchor="middle" fill="#ffffff" fontSize={15} fontWeight={500}>
        {total}
      </text>
      <text x={C} y={C + 13} textAnchor="middle" fill="#8a95a3" fontSize={8.5}>
        readings
      </text>

      {/* Latest reading per sensor */}
      {callouts.map((c) =>
        !c.available ? (
          <g key={c.id} opacity={0.75}>
            <circle cx={c.x} cy={c.y} r={5.5} fill="none" stroke="#6b7685" strokeWidth={1.5} strokeDasharray="2 2" />
            <rect x={c.lx} y={c.ly} width={c.width} height={22} rx={11} fill="none" stroke="#6b7685" strokeDasharray="3 3" />
            <text x={c.lx + 10} y={c.ly + 14.5} fill="#aab3be" fontSize={10.5} fontWeight={500}>
              {c.text}
              <tspan dx={5} fill="#7d8896">
                {c.value}
              </tspan>
            </text>
          </g>
        ) : (
        <g key={c.id}>
          <circle cx={c.x} cy={c.y} r={5.5} fill="none" stroke="#ffffff" strokeWidth={1.5} />
          <circle cx={c.x} cy={c.y} r={2.6} fill={c.level === 'safe' ? '#ffffff' : DOT_FILL[c.level]} />
          <rect x={c.lx} y={c.ly} width={c.width} height={22} rx={11} fill="#ffffff" />
          <text x={c.lx + 10} y={c.ly + 14.5} fill="var(--color-ink)" fontSize={10.5} fontWeight={500}>
            {c.text}
            <tspan dx={5} fill={c.level === 'safe' ? 'var(--color-ink-3)' : DOT_FILL[c.level]} fontWeight={600}>
              {c.value}
            </tspan>
          </text>
        </g>
        ),
      )}
    </svg>
  )
}

