import { useMemo } from 'react'
import { SCORE_CRITICAL, SCORE_WARNING, SENSOR_ORDER } from '../../lib/evaluate'
import { formatTime } from '../../lib/format'
import type { DataMode, HistoryPoint, StatusLevel } from '../../types/telemetry'
import { SectionHeader, Surface } from '../ui/primitives'

const BUCKETS = 10
/** Minimum track height; tracks grow with the panel. */
const MIN_TRACK = 120
const GAP = 3
/** Live: readings needed before the chart is drawn. */
const MIN_LIVE_POINTS = 3

const mmss = new Intl.DateTimeFormat(undefined, { minute: '2-digit', second: '2-digit' })

const RANK: Record<StatusLevel, number> = { safe: 0, warning: 1, critical: 2 }
/** Live readings have no 0–100 score: a bar fills up to the top of its status band. */
const BAND_TOP: Record<StatusLevel, number> = { safe: SCORE_WARNING, warning: SCORE_CRITICAL, critical: 100 }

interface Bar {
  t: number
  /** Bar height on the 0–100 scale */
  height: number
  /** Number shown above the bar */
  label: number
  elevated: boolean
}

/** Split history into up to BUCKETS equal slices, newest slice last (always includes the latest reading). */
function slices(history: HistoryPoint[]): HistoryPoint[][] {
  const n = history.length
  if (!n) return []
  const size = Math.ceil(n / BUCKETS)
  const out: HistoryPoint[][] = []
  for (let end = n; end > 0; end -= size) out.unshift(history.slice(Math.max(0, end - size), end))
  return out
}

function worstLevel(points: HistoryPoint[]): StatusLevel | null {
  let worst: StatusLevel | null = null
  for (const p of points)
    for (const id of SENSOR_ORDER) {
      const l = p.sensors[id].level
      if (l && (worst === null || RANK[l] > RANK[worst])) worst = l
    }
  return worst
}

/**
 * Environmental trends as rounded stacked bars (after the reference's
 * "Agents overnight" chart). Demo: peak risk index per time slice.
 * Live: worst alert level per time slice, from readings received this session.
 */
export function TrendBars({ history, mode = 'demo', stale = false }: { history: HistoryPoint[]; mode?: DataMode; stale?: boolean }) {
  const isLive = mode === 'live'
  const bars = useMemo<Bar[]>(
    () =>
      slices(history).map((slice) => {
        const t = slice[slice.length - 1].t
        if (!isLive) {
          const peak = Math.max(...slice.map((p) => p.riskIndex ?? 0))
          return { t, height: peak, label: peak, elevated: peak >= SCORE_WARNING }
        }
        const worst = worstLevel(slice)
        return {
          t,
          height: worst ? BAND_TOP[worst] : 0,
          label: Math.max(...slice.map((p) => p.activeCount)),
          elevated: worst !== null && worst !== 'safe',
        }
      }),
    [history, isLive],
  )

  const spanSeconds = ((history[history.length - 1]?.t ?? 0) - (history[0]?.t ?? 0)) / 1000
  const bucketSeconds = Math.max(1, Math.round(spanSeconds / Math.max(1, bars.length)))
  const elevated = bars.filter((b) => b.elevated).length
  const collecting = isLive && history.length < MIN_LIVE_POINTS

  const meta = isLive
    ? collecting
      ? 'Live readings from this session'
      : `Active alerts per ${bucketSeconds}s · this session${stale ? ' · stale' : ''}`
    : `Peak risk per ${bucketSeconds}s, last 2 minutes`
  const aria = isLive
    ? `Alert level over this session. ${elevated} of ${bars.length} time slices had an active alert.`
    : `Risk index over the last 2 minutes. Peak ${Math.max(0, ...bars.map((b) => b.label))}.`

  return (
    <Surface aria-labelledby="trend-title" className="flex flex-col">
      <SectionHeader id="trend-title" title="Environmental trends" meta={meta} />
      <div className="relative flex flex-1 items-stretch gap-1.5 px-5 pt-3" role="img" aria-label={collecting ? 'Collecting live readings' : aria}>
        {collecting ? (
          <>
            {Array.from({ length: BUCKETS }, (_, i) => (
              <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center" aria-hidden>
                <span className="mb-1.5 text-[10.5px] text-transparent">0</span>
                <div className="w-full max-w-[22px] flex-1 rounded-full bg-mist" style={{ minHeight: `min(${MIN_TRACK}px, 12dvh)` }} />
                <span className="mt-2 text-[9.5px] text-transparent">00:00</span>
              </div>
            ))}
            <p className="absolute inset-x-5 top-1/2 -translate-y-1/2 text-center text-[12px] text-ink-3" role="status">
              Collecting live readings… <span className="tnum">{history.length}</span> of {MIN_LIVE_POINTS} so far
            </p>
          </>
        ) : (
          bars.map((b, i) => {
            const normal = Math.min(b.height, SCORE_WARNING)
            const warn = Math.max(0, Math.min(b.height, SCORE_CRITICAL) - SCORE_WARNING)
            const crit = Math.max(0, b.height - SCORE_CRITICAL)
            const h = (v: number) => `max(${v > 0 ? 6 : 0}px, calc(${v}% - ${GAP}px))`
            const latest = i === bars.length - 1
            return (
              <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center">
                <span className={`tnum mb-1.5 text-[10.5px] ${latest ? 'font-medium text-ink' : 'text-ink-3'}`}>{b.label}</span>
                <div
                  className="flex w-full max-w-[22px] flex-1 flex-col-reverse overflow-hidden rounded-full bg-mist"
                  style={{ gap: GAP, minHeight: `min(${MIN_TRACK}px, 12dvh)` }}
                >
                  {[
                    { v: normal, c: 'bg-[#d5d9df]' },
                    { v: warn, c: 'bg-warn' },
                    { v: crit, c: 'bg-crit' },
                  ]
                    .filter((s) => s.v > 0)
                    .map((s, k) => (
                      <span
                        key={k}
                        className={`block w-full shrink-0 rounded-full transition-[height] duration-500 ease-out ${s.c}`}
                        style={{ height: h(s.v) }}
                      />
                    ))}
                </div>
                <span className="tnum mt-2 text-[9.5px] text-ink-3" title={formatTime(b.t)}>
                  {latest && !stale ? 'now' : mmss.format(b.t)}
                </span>
              </div>
            )
          })
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pt-3 pb-4 text-[11.5px] text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#d5d9df]" aria-hidden />
          Normal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-warn" aria-hidden />
          Warning
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-crit" aria-hidden />
          Critical
        </span>
        <span className="ml-auto text-ink-3">
          <span className="tnum font-medium text-ink">{elevated}</span> of {bars.length} elevated
        </span>
      </div>
    </Surface>
  )
}
