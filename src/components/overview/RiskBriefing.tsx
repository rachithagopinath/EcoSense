import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { SENSOR_ORDER } from '../../lib/evaluate'
import { formatTime } from '../../lib/format'
import type { StatusLevel, TelemetrySnapshot } from '../../types/telemetry'
import { Logo } from '../layout/Logo'
import { RiskRadial } from './RiskRadial'

const NUMBER_WORD = ['No', 'One', 'Two', 'Three', 'Four']

/** Editorial headline, in the spirit of "Two Tier 1 vendors need you today". */
function briefingTitle(snapshot: TelemetrySnapshot): string {
  const { sensors } = snapshot
  // Live: a specific summary (flame / rain / both) from the real readings.
  if (snapshot.mode === 'live') return snapshot.overall.headline
  const critical = SENSOR_ORDER.filter((id) => sensors[id].level === 'critical').length
  const warning = SENSOR_ORDER.filter((id) => sensors[id].level === 'warning').length
  if (critical) return `${NUMBER_WORD[critical]} ${critical === 1 ? 'hazard needs' : 'hazards need'} attention now`
  if (warning) return `${NUMBER_WORD[warning]} ${warning === 1 ? 'reading is' : 'readings are'} worth watching`
  return 'All clear across the four sensors'
}

const CHIP: Record<StatusLevel, { text: string; className: string }> = {
  safe: { text: 'Low risk', className: 'bg-safe/15 text-[#5fd39a]' },
  warning: { text: 'Elevated risk', className: 'bg-warn/15 text-[#f6ad62]' },
  critical: { text: 'High risk', className: 'bg-crit/20 text-[#ff8a7e]' },
}

/** Live mode never claims "low risk": only that no alert is active on the sensors that report. */
const LIVE_CHIP: Record<StatusLevel, string> = { safe: 'No active alerts', warning: 'Warning', critical: 'Critical' }

/** The dark feature panel: one statement, one number, one visual. */
export function RiskBriefing({ snapshot }: { snapshot: TelemetrySnapshot }) {
  const { overall, sensors, mode, stale } = snapshot
  const isLive = mode === 'live'
  const avail = SENSOR_ORDER.filter((id) => sensors[id].available)
  const counts = {
    critical: avail.filter((id) => sensors[id].level === 'critical').length,
    warning: avail.filter((id) => sensors[id].level === 'warning').length,
    safe: avail.filter((id) => sensors[id].level === 'safe').length,
  }
  const title = briefingTitle(snapshot)
  const bigNumber = !isLive ? String(overall.riskIndex ?? '—') : overall.known ? String(overall.activeHazards.length) : '—'
  const chip = !overall.known
    ? { text: 'No data yet', className: 'bg-white/10 text-white/70' }
    : { text: isLive ? LIVE_CHIP[overall.level] : CHIP[overall.level].text, className: CHIP[overall.level].className }
  const caption = !isLive
    ? 'Risk out of 100, rule-based'
    : `${overall.activeHazards.length === 1 ? 'Active alert' : 'Active alerts'} · ${overall.availableCount} of ${SENSOR_ORDER.length} sensors live`
  const explanation =
    stale && overall.known
      ? `${overall.explanation} Last known state: the ESP32 has stopped sending data.`
      : [overall.explanation, overall.advice, overall.caveat].filter(Boolean).join(' ')

  return (
    <section
      aria-labelledby="briefing-title"
      className="relative flex w-full min-w-0 flex-col overflow-hidden rounded-[20px] bg-night text-white shadow-[0_20px_40px_-24px_rgb(12_17_24/0.6)]"
    >
      <div className="grid flex-1 items-center gap-2 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="flex flex-col p-6 sm:p-7 short:py-3.5">
          <p className="flex items-center gap-2 text-[10px] font-medium tracking-[0.12em] text-white/55 uppercase">
            <span className="grid size-5 place-items-center rounded-full bg-white/8">
              <Logo className="size-3.5" tone="#ffffff" />
            </span>
            {!isLive ? (
              <>Risk assessment · updated {formatTime(snapshot.timestamp)}</>
            ) : stale ? (
              <span className="text-[#f6ad62]">Stale · last reading {formatTime(snapshot.timestamp)}</span>
            ) : overall.known ? (
              <>Live · ESP32 · updated {formatTime(snapshot.timestamp)}</>
            ) : (
              <>Live · ESP32 · waiting for data</>
            )}
          </p>

          <motion.h2
            key={title}
            id="briefing-title"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-5 short:mt-3.5 max-w-[15ch] text-[24px] leading-[1.2] font-normal tracking-[-0.02em] sm:text-[26px]"
          >
            {title}
          </motion.h2>
          <p className="mt-3 max-w-[38ch] text-[12.5px] leading-relaxed text-white/60" aria-live="polite">
            {explanation}
          </p>

          <div className="mt-8 flex items-end gap-4 short:mt-4">
            <span className={cn('tnum text-[64px] leading-[0.85] font-light tracking-[-0.04em]', stale && 'text-white/45')}>{bigNumber}</span>
            <div className="pb-1">
              <span
                className={cn(
                  'inline-flex h-5 items-center rounded-full px-2 text-[9.5px] font-semibold tracking-[0.1em] uppercase transition-colors',
                  chip.className,
                )}
              >
                {chip.text}
              </span>
              <p className="mt-1.5 text-[12px] whitespace-nowrap text-white/55">{caption}</p>
            </div>
          </div>

          <ul className="mt-6 short:mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-white/70" aria-label="Sensor status counts">
            <li className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-crit" aria-hidden />
              <span className="tnum font-medium text-white">{counts.critical}</span> Critical
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-warn" aria-hidden />
              <span className="tnum font-medium text-white">{counts.warning}</span> Warning
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2 rounded-full border border-white/60" aria-hidden />
              <span className="tnum font-medium text-white">{counts.safe}</span> Normal
            </li>

          </ul>
        </div>

        <div className="relative mx-4 mb-6 aspect-[512/400] md:mx-0 md:mr-4 md:mb-0 md:aspect-auto md:h-full md:min-h-[320px] md:py-4 short:min-h-[250px]">
          <div className="absolute inset-0 md:inset-y-4">
            <RiskRadial snapshot={snapshot} />
          </div>
        </div>
      </div>
    </section>
  )
}
