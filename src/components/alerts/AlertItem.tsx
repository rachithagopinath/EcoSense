import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { formatRelative, formatTime } from '../../lib/format'
import { SENSOR_ICON } from '../../lib/sensorIcons'
import { ALERT_STYLE } from '../../lib/status'
import type { Alert } from '../../types/telemetry'

export function AlertItem({ alert: a, now, showSeverity }: { alert: Alert; now: number; showSeverity?: boolean }) {
  const Icon = SENSOR_ICON[a.sensor]
  const s = ALERT_STYLE[a.severity]
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="flex gap-3.5 px-6 py-3.5"
    >
      <span className="relative mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-line bg-mist">
        <Icon className="size-3.5 text-ink-2" strokeWidth={1.75} aria-hidden />
        <span className={cn('absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-paper', s.dot)} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className={cn('truncate text-[13.5px] font-medium', a.severity === 'resolved' ? 'text-ink-2' : 'text-ink')}>{a.title}</p>
          <time className="tnum shrink-0 text-[12px] text-ink-3" dateTime={new Date(a.timestamp).toISOString()} title={formatTime(a.timestamp)}>
            {formatRelative(a.timestamp, now)}
          </time>
        </div>
        <p className="mt-0.5 text-[13px] text-ink-3">
          {showSeverity && <span className={cn('mr-1.5 font-medium', s.text)}>{s.label}</span>}
          {a.message}
        </p>
      </div>
    </motion.li>
  )
}
