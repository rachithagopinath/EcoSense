import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { SENSOR_META, SENSOR_ORDER } from '../../lib/evaluate'
import { formatTime } from '../../lib/format'
import { SENSOR_ICON } from '../../lib/sensorIcons'
import { LEVEL_STYLE } from '../../lib/status'
import type { StatusLevel, TelemetrySnapshot } from '../../types/telemetry'
import { SectionHeader, StatusPill, Surface, UnavailablePill } from '../ui/primitives'

const ORDER: StatusLevel[] = ['safe', 'warning', 'critical']

/** Four sensors with a segmented summary bar (after the reference's "Evidence health"). */
export function SensorHealth({ snapshot, onOpen }: { snapshot: TelemetrySnapshot; onOpen: () => void }) {
  const { sensors, mode, stale, overall } = snapshot
  const rank = (id: (typeof SENSOR_ORDER)[number]) => (sensors[id].available ? ORDER.indexOf(sensors[id].level) : ORDER.length)
  const segments = [...SENSOR_ORDER].sort((a, b) => rank(a) - rank(b))
  const count = (l: StatusLevel) => SENSOR_ORDER.filter((id) => sensors[id].available && sensors[id].level === l).length
  const unavailable = SENSOR_ORDER.filter((id) => !sensors[id].available).length
  const meta =
    mode === 'demo'
      ? '4 of 4 reporting · simulated, ESP32 offline'
      : stale
        ? `Last reading ${formatTime(snapshot.timestamp)} · ESP32 disconnected`
        : !overall.known
          ? 'Waiting for the first reading from the ESP32'
          : `${overall.availableCount} of ${SENSOR_ORDER.length} reporting · live via USB`

  return (
    <Surface aria-labelledby="health-title" className="flex flex-col">
      <SectionHeader
        id="health-title"
        title="Sensor health"
        meta={meta}
        action={
          <button type="button" onClick={onOpen} className="text-[12px] text-ink-3 hover:text-ink">
            Details
          </button>
        }
      />
      <div className="px-5">
        <div className="flex h-1.5 gap-1" aria-hidden>
          {segments.map((id) => (
            <motion.span
              key={id}
              layout
              className={cn(
                'flex-1 rounded-full transition-colors duration-500',
                !sensors[id].available
                  ? 'border border-dashed border-line-strong bg-transparent'
                  : sensors[id].level === 'safe'
                    ? 'bg-[#cfd4da]'
                    : LEVEL_STYLE[sensors[id].level].dot,
              )}
            />
          ))}
        </div>
        <p className="mt-2.5 flex flex-wrap gap-x-4 text-[11.5px] text-ink-2">
          {ORDER.map((l) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className={cn('size-1.5 rounded-full', l === 'safe' ? 'bg-[#aeb5bd]' : LEVEL_STYLE[l].dot)} aria-hidden />
              <span className="tnum font-medium text-ink">{count(l)}</span> {LEVEL_STYLE[l].label}
            </span>
          ))}
          {unavailable > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full border border-dashed border-ink-3" aria-hidden />
              <span className="tnum font-medium text-ink">{unavailable}</span> Unavailable
            </span>
          )}
        </p>
      </div>

      <ul className="mt-3 flex flex-1 flex-col divide-y divide-line px-5 pb-2 short:mt-1.5 short:pb-1">
        {SENSOR_ORDER.map((id) => {
          const Icon = SENSOR_ICON[id]
          const name = SENSOR_META[id].name
          const s = sensors[id]
          return (
            <li key={id} className={cn('flex flex-1 items-center gap-3 py-2.5 short:py-1', stale && s.available && 'opacity-70')}>
              <span className={cn('grid size-8 shrink-0 place-items-center rounded-[10px] border bg-mist', s.available ? 'border-line' : 'border-dashed border-line-strong')}>
                <Icon
                  className={cn('size-3.5', !s.available ? 'text-ink-3' : s.level === 'safe' ? 'text-ink-2' : LEVEL_STYLE[s.level].text)}
                  strokeWidth={1.8}
                  aria-hidden
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink">{name}</p>
                <p className="tnum truncate text-[11.5px] text-ink-3" title={s.detail}>
                  {s.detail}
                </p>
              </div>
              {!s.available ? (
                <UnavailablePill label={s.label} />
              ) : (
                <StatusPill level={s.level} label={s.level === 'safe' ? s.label : undefined} />
              )}
            </li>
          )
        })}
      </ul>
    </Surface>
  )
}
