import { useMemo } from 'react'
import { SCORE_CRITICAL, SCORE_WARNING } from '../../lib/evaluate'
import { formatTime } from '../../lib/format'
import type { HistoryPoint } from '../../types/telemetry'
import { SectionHeader, Surface } from '../ui/primitives'

const BUCKETS = 10
/** Minimum track height; tracks grow with the panel. */
const MIN_TRACK = 120
const GAP = 3

const mmss = new Intl.DateTimeFormat(undefined, { minute: '2-digit', second: '2-digit' })

/**
 * Environmental trends as rounded stacked bars (after the reference's
 * "Agents overnight" chart). Each bar is the peak risk index in a time slice,
 * split into its normal / warning / critical portions.
 */
export function TrendBars({ history }: { history: HistoryPoint[] }) {
  const bars = useMemo(() => {
    const size = Math.max(1, Math.floor(history.length / BUCKETS))
    const out: { t: number; peak: number }[] = []
    for (let b = 0; b < BUCKETS; b++) {
      const slice = history.slice(b * size, (b + 1) * size)
      if (!slice.length) continue
      out.push({ t: slice[slice.length - 1].t, peak: Math.max(...slice.map((p) => p.riskIndex)) })
    }
    return out
  }, [history])

  const bucketSeconds = Math.round(((history[history.length - 1]?.t ?? 0) - (history[0]?.t ?? 0)) / 1000 / BUCKETS)
  const peak = Math.max(0, ...bars.map((b) => b.peak))
  const elevated = bars.filter((b) => b.peak >= SCORE_WARNING).length

  return (
    <Surface aria-labelledby="trend-title" className="flex flex-col">
      <SectionHeader id="trend-title" title="Environmental trends" meta={`Peak risk per ${bucketSeconds}s, last 2 minutes`} />
      <div className="flex flex-1 items-stretch gap-1.5 px-5 pt-3" role="img" aria-label={`Risk index over the last 2 minutes. Peak ${peak}.`}>
        {bars.map((b, i) => {
          const normal = Math.min(b.peak, SCORE_WARNING)
          const warn = Math.max(0, Math.min(b.peak, SCORE_CRITICAL) - SCORE_WARNING)
          const crit = Math.max(0, b.peak - SCORE_CRITICAL)
          const h = (v: number) => `max(${v > 0 ? 6 : 0}px, calc(${v}% - ${GAP}px))`
          const latest = i === bars.length - 1
          return (
            <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center">
              <span className={`tnum mb-1.5 text-[10.5px] ${latest ? 'font-medium text-ink' : 'text-ink-3'}`}>{b.peak}</span>
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
                {latest ? 'now' : mmss.format(b.t)}
              </span>
            </div>
          )
        })}
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
