import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronRight, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTelemetry } from '../../context/telemetryContext'
import { useNow } from '../../hooks/useNow'
import { isActive } from '../../lib/alerts'
import { cn } from '../../lib/cn'
import { formatNumber, RULES, SENSOR_META, SENSOR_ORDER } from '../../lib/evaluate'
import { formatRelative, formatTime } from '../../lib/format'
import { LIVE_DEVICE, LIVE_RULE_TEXT } from '../../lib/live'
import { SENSOR_ICON } from '../../lib/sensorIcons'
import { ALERT_STYLE, LEVEL_STYLE } from '../../lib/status'
import type { Alert, DataMode, SensorId, TelemetrySnapshot } from '../../types/telemetry'
import { Logo } from '../layout/Logo'
import { Sparkline } from '../ui/Sparkline'
import { Surface } from '../ui/primitives'

type Tab = 'active' | 'all'

const ACTION: Record<SensorId, { warning: string; critical: string; suggest: { warning: string; critical: string } }> = {
  fire: {
    warning: 'Check for a possible flame',
    critical: 'Respond to flame detection',
    suggest: { warning: 'Inspect the area near the flame sensor', critical: 'Notify the fire response team' },
  },
  flood: {
    warning: 'Watch rising rainfall',
    critical: 'Prepare for flood risk',
    suggest: { warning: 'Check drains near the rain sensor', critical: 'Warn people in low-lying areas' },
  },
  air: {
    warning: 'Review rising gas levels',
    critical: 'Respond to poor air quality',
    suggest: { warning: 'Improve ventilation nearby', critical: 'Advise people to stay indoors' },
  },
  temperature: {
    warning: 'Monitor rising temperature',
    critical: 'Respond to extreme heat',
    suggest: { warning: 'Plan shade and water breaks', critical: 'Pause outdoor activity' },
  },
}

const SEVERITY_RANK = { critical: 0, warning: 1, resolved: 2 }

const deviceName = (id: SensorId, mode: DataMode) => (mode === 'live' ? LIVE_DEVICE[id] : SENSOR_META[id].device)

function age(ms: number): string {
  const s = Math.max(1, Math.round(ms / 1000))
  if (s < 60) return s === 1 ? '1 second' : `${s} seconds`
  const m = Math.round(s / 60)
  return m === 1 ? '1 minute' : `${m} minutes`
}

function FeaturedAlert({
  alert,
  snapshot,
  now,
  onAcknowledge,
  onView,
}: {
  alert: Alert
  snapshot: TelemetrySnapshot
  now: number
  onAcknowledge: () => void
  onView: () => void
}) {
  const sev = alert.severity === 'critical' ? 'critical' : 'warning'
  const meta = SENSOR_META[alert.sensor]
  const Icon = SENSOR_ICON[alert.sensor]
  const status = snapshot.sensors[alert.sensor]
  const rule = RULES[alert.sensor]
  const isLive = snapshot.mode === 'live'
  const liveRule = LIVE_RULE_TEXT[alert.sensor]
  const activeCount = snapshot.overall.activeHazards.length
  const steps = [
    {
      label: 'Reading',
      value: status.available ? `${status.display} ${status.unit}`.trim() : status.label,
      note: deviceName(alert.sensor, snapshot.mode),
    },
    isLive
      ? { label: 'Threshold', value: (sev === 'critical' ? liveRule.critical : liveRule.warning) ?? liveRule.alert, note: `${sev === 'critical' ? 'Critical' : 'Warning'} level` }
      : { label: 'Threshold', value: `≥ ${sev === 'critical' ? rule.critical : rule.warning} ${meta.unit}`, note: `${sev === 'critical' ? 'Critical' : 'Warning'} level` },
    isLive
      ? { label: 'Assessment', value: `${activeCount} active ${activeCount === 1 ? 'alert' : 'alerts'}`, note: snapshot.stale ? 'Last known state' : `${ALERT_STYLE[snapshot.overall.level === 'safe' ? 'resolved' : snapshot.overall.level].label} overall` }
      : { label: 'Assessment', value: `Risk ${snapshot.overall.riskIndex}`, note: `${LEVEL_STYLE[snapshot.overall.level].band} overall` },
  ]

  return (
    <motion.article
      key={alert.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-[16px] border border-line bg-mist/70 p-4"
      aria-labelledby={`${alert.id}-title`}
    >
      <div className="flex items-center justify-between gap-3 text-[10px] tracking-[0.1em] text-ink-3 uppercase">
        <span>
          {isLive ? 'First detected' : 'Raised'} {formatTime(alert.timestamp)} · {alert.ref}
        </span>
        <span className="normal-case tracking-normal">{formatRelative(alert.timestamp, now)}</span>
      </div>
      <h3 id={`${alert.id}-title`} className="mt-2 text-[17px] leading-snug font-normal tracking-[-0.015em] text-ink">
        {ACTION[alert.sensor][sev]}
      </h3>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">{alert.message}</p>
      {snapshot.stale && (
        <p className="mt-1.5 text-[12px] text-warn">ESP32 disconnected. This is the last known state, not confirmation that it has cleared.</p>
      )}

      <div className="mt-3.5 flex flex-wrap items-center gap-2 text-[12px]">
        <span className="inline-flex items-center gap-1.5 font-medium text-ink">
          <Icon className="size-3.5" strokeWidth={1.8} aria-hidden />
          {meta.name}
        </span>
        <span className="rounded-full bg-night px-2 py-0.5 text-[10.5px] text-white">{ALERT_STYLE[sev].label}</span>
        <span className="inline-flex items-center gap-1.5 text-ink-2">
          <span className={cn('size-1.5 rounded-full', status.available ? LEVEL_STYLE[status.level].dot : 'border border-dashed border-ink-3')} aria-hidden />
          {status.score !== null && <span className="tnum font-medium text-ink">{status.score}</span>} {status.label}
        </span>
      </div>

      <ol className="relative mt-4 grid grid-cols-3 gap-3">
        <span className="absolute top-[4px] right-[16%] left-[4px] h-px bg-line-strong" aria-hidden />
        {steps.map((s) => (
          <li key={s.label} className="relative">
            <span className="block size-[9px] rounded-full border-2 border-mist bg-accent" aria-hidden />
            <p className="mt-2 text-[11.5px] font-medium text-ink">{s.label}</p>
            <p className="tnum text-[11px] text-ink-2">{s.value}</p>
            <p className="text-[10.5px] text-ink-3">{s.note}</p>
          </li>
        ))}
      </ol>

      <p className="mt-4 flex items-center gap-2 border-t border-line pt-3 text-[12px] text-ink-2">
        <span className="grid size-5 place-items-center rounded-full bg-accent-soft">
          <Logo className="size-3" />
        </span>
        <span>
          Rule engine suggests: <span className="text-ink">{ACTION[alert.sensor].suggest[sev]}</span>
        </span>
      </p>

      <div className="mt-3.5 flex gap-2">
        <button
          type="button"
          onClick={onAcknowledge}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-night px-3.5 text-[12px] font-medium text-white hover:bg-night-2"
        >
          <Check className="size-3.5" aria-hidden />
          Acknowledge
        </button>
        <button
          type="button"
          onClick={onView}
          className="inline-flex h-8 items-center rounded-full border border-line bg-paper px-3.5 text-[12px] font-medium text-ink hover:border-line-strong"
        >
          View sensor
        </button>
      </div>
    </motion.article>
  )
}

function AlertRow({ alert, now, mode, onOpen }: { alert: Alert; now: number; mode: DataMode; onOpen: () => void }) {
  const Icon = SENSOR_ICON[alert.sensor]
  const s = ALERT_STYLE[alert.severity]
  return (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <button type="button" onClick={onOpen} className="group flex w-full items-center gap-3 py-3 text-left short:py-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-full border border-accent/25 bg-accent-soft text-accent">
          <Icon className="size-3.5" strokeWidth={1.8} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-medium text-ink">{alert.title}</span>
          <span className="block truncate text-[11px] text-ink-3">
            {deviceName(alert.sensor, mode)} · {alert.ref}
            {alert.acknowledged && alert.severity !== 'resolved' ? ' · acknowledged' : ''}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[11.5px] font-medium text-ink">{formatRelative(alert.timestamp, now)}</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-ink-2">
            <span className={cn('size-1.5 rounded-full', s.dot)} aria-hidden />
            {s.label}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </button>
    </motion.li>
  )
}

/** Right-hand column: what needs attention now, then the rest, then two session stats. */
export function AttentionPanel({
  snapshot,
  onOpenAlerts,
  onOpenMonitoring,
}: {
  snapshot: TelemetrySnapshot
  onOpenAlerts: () => void
  onOpenMonitoring: () => void
}) {
  const { alerts, acknowledge } = useTelemetry()
  const now = useNow(5000)
  const [tab, setTab] = useState<Tab>('active')

  const active = useMemo(
    () =>
      alerts
        .filter(isActive)
        .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.timestamp - a.timestamp),
    [alerts],
  )
  const featured = active[0]
  const list = (tab === 'active' ? active.slice(1) : alerts.filter((a) => a.id !== featured?.id)).slice(0, tab === 'active' ? 3 : 5)
  const alerting = new Set(active.map((a) => a.sensor))
  const watching = tab === 'active' ? SENSOR_ORDER.filter((id) => !alerting.has(id)) : []

  const isLive = snapshot.mode === 'live'
  const oldest = active.length ? Math.min(...active.map((a) => a.timestamp)) : null
  const peak = Math.max(0, ...snapshot.history.map((p) => p.riskIndex ?? 0))
  const temps = snapshot.history.map((p) => p.sensors.temperature.value).filter((v): v is number => v !== null)
  const temp = snapshot.sensors.temperature
  const humidity = snapshot.live?.humidity ?? null
  const raised = alerts.filter((a) => a.severity !== 'resolved')
  const crit = raised.filter((a) => a.severity === 'critical').length

  return (
    <Surface aria-labelledby="attention-title" className="flex h-full w-full min-w-0 flex-col">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3.5 short:pt-4 short:pb-2.5">
        <div>
          <h2 id="attention-title" className="text-[18px] font-normal tracking-[-0.02em] text-ink">
            Needs attention
          </h2>
          <p className="mt-0.5 text-[12px] text-ink-3">
            {active.length
              ? `${active.length} active ${active.length === 1 ? 'hazard' : 'hazards'}. The oldest is ${age(snapshot.timestamp - oldest!)} old.`
              : isLive && !snapshot.overall.known
                ? 'Waiting for the first reading.'
                : 'No active hazards right now.'}
            {snapshot.stale && <span className="text-warn"> ESP32 disconnected, showing last known state.</span>}
          </p>
        </div>
        <div role="tablist" aria-label="Show alerts" className="flex shrink-0 rounded-full border border-line bg-mist p-0.5">
          {(['active', 'all'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                'flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] capitalize transition-colors',
                tab === t ? 'bg-night text-white' : 'text-ink-2 hover:text-ink',
              )}
            >
              {t}
              <span className={cn('tnum grid h-4 min-w-4 place-items-center rounded-[5px] px-1 text-[10px]', tab === t ? 'bg-white/15' : 'bg-paper text-ink-3')}>
                {t === 'active' ? active.length : alerts.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Featured card + list scroll together inside the panel, so this column never pushes the page taller. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="px-5">
        {featured ? (
            <FeaturedAlert
              key={featured.id}
              alert={featured}
              snapshot={snapshot}
              now={now}
              onAcknowledge={() => acknowledge(featured.id)}
              onView={onOpenMonitoring}
            />
          ) : (
            <motion.div
              key="calm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-3 rounded-[16px] border border-line bg-mist/70 p-4"
              role="status"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-safe-soft text-safe">
                <ShieldCheck className="size-4" strokeWidth={1.8} aria-hidden />
              </span>
              <div>
                <p className="text-[15px] font-normal tracking-[-0.01em] text-ink">Nothing needs your attention</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                  {!isLive
                    ? 'All four sensors are within safe limits. A card appears here as soon as a reading crosses its threshold. Try a demo scenario.'
                    : !snapshot.overall.known
                      ? 'Connected to the ESP32. Alerts appear here as soon as readings arrive and a sensor detects a hazard.'
                      : `No live sensor is reporting an alert. ${SENSOR_ORDER.filter((id) => !snapshot.sensors[id].available)
                          .map((id) => SENSOR_META[id].name)
                          .join(' and ')} ${SENSOR_ORDER.filter((id) => !snapshot.sensors[id].available).length === 1 ? 'is' : 'are'} not connected, so this is not a complete safety check.`}
                </p>
              </div>
            </motion.div>
          )}
      </div>

      <div className="px-5 pt-2">
        {list.length > 0 && (
          <ul className="divide-y divide-line" aria-label={tab === 'active' ? 'Other active alerts' : 'All alerts'}>
            <AnimatePresence initial={false}>
              {list.map((a) => (
                <AlertRow key={a.id} alert={a} now={now} mode={snapshot.mode} onOpen={onOpenAlerts} />
              ))}
            </AnimatePresence>
          </ul>
        )}
        {tab === 'all' && list.length === 0 && <p className="py-4 text-[12px] text-ink-3">No alerts this session yet.</p>}

        {watching.length > 0 && (
          <div className={cn(list.length > 0 && 'mt-1 border-t border-line pt-1')}>
            <p className="eyebrow pt-3 pb-1">Watching</p>
            <ul className="divide-y divide-line" aria-label="Sensors being watched">
              {watching.map((id) => {
                const Icon = SENSOR_ICON[id]
                const meta = SENSOR_META[id]
                const rule = RULES[id]
                const st = snapshot.sensors[id]
                return (
                  <li key={id} className="flex items-center gap-3 py-2.5 short:py-1">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line bg-paper text-ink-2">
                      <Icon className="size-3.5" strokeWidth={1.8} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-ink">{meta.name}</span>
                      <span className="block truncate text-[11px] text-ink-3">
                        {isLive ? LIVE_RULE_TEXT[id].alert : `Alerts at ≥ ${rule.warning} · critical ≥ ${rule.critical} ${meta.unit}`}
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[11.5px] text-ink-2">
                      <span
                        className={cn('size-1.5 rounded-full', st.available ? LEVEL_STYLE[st.level].dot : 'border border-dashed border-ink-3')}
                        aria-hidden
                      />
                      {!st.available ? st.label : st.level === 'safe' ? 'Watching' : st.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
      </div>

      <div className="m-3 mt-2 grid grid-cols-2 gap-4 rounded-[14px] bg-mist px-4 py-3.5">
        {isLive ? (
          <div className="min-w-0">
            <p className="eyebrow">Temperature · DHT11</p>
            <div className="mt-1 flex items-end gap-2">
              <span className={cn('tnum text-[22px] leading-none font-normal tracking-[-0.02em]', snapshot.stale ? 'text-ink-3' : 'text-ink')}>
                {temp.available ? `${temp.display} °C` : '—'}
              </span>
              {temps.length > 1 && (
                <div className="mb-0.5 w-16">
                  <Sparkline values={temps} height={18} minSpan={2} ariaLabel="Temperature this session" />
                </div>
              )}
            </div>
            <p className="mt-1 text-[11px] text-ink-3">
              {temp.available ? `Humidity ${humidity === null ? 'n/a' : `${formatNumber(humidity, 0)}%`}` : temp.label}
              {snapshot.stale ? ' · stale' : ''}
            </p>
          </div>
        ) : (
          <div className="min-w-0">
            <p className="eyebrow">Peak risk · 2 min</p>
            <div className="mt-1 flex items-end gap-2">
              <span className="tnum text-[22px] leading-none font-normal tracking-[-0.02em] text-ink">{peak}</span>
              <div className="mb-0.5 w-16">
                <Sparkline values={snapshot.history.map((p) => p.riskIndex ?? 0)} height={18} minSpan={20} ariaLabel="Risk index over the last 2 minutes" />
              </div>
            </div>
            <p className="mt-1 text-[11px] text-ink-3">Now {snapshot.overall.riskIndex}</p>
          </div>
        )}
        <div className="min-w-0">
          <p className="eyebrow">Alerts raised</p>
          <p className="tnum mt-1 text-[22px] leading-none font-normal tracking-[-0.02em] text-ink">{raised.length}</p>
          <p className="mt-1 text-[11px] text-ink-3">
            {crit} critical, {raised.length - crit} warning
          </p>
        </div>
      </div>
    </Surface>
  )
}
