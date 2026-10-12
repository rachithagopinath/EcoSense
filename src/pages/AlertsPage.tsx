import { AnimatePresence } from 'framer-motion'
import { Inbox } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AlertItem } from '../components/alerts/AlertItem'
import { PageHeader } from '../components/layout/PageHeader'
import { Surface } from '../components/ui/primitives'
import { useTelemetry } from '../context/telemetryContext'
import { useNow } from '../hooks/useNow'
import { cn } from '../lib/cn'
import type { Alert, AlertSeverity } from '../types/telemetry'

type Filter = 'all' | 'active' | AlertSeverity

/** The condition is still present (acknowledged or not); only a real reading can clear it. */
const isOpen = (a: Alert) => a.severity !== 'resolved' && !a.cleared

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'critical', label: 'Critical' },
  { id: 'warning', label: 'Warning' },
  { id: 'resolved', label: 'Resolved' },
]

export function AlertsPage() {
  const { alerts, clearAlerts, mode, snapshot } = useTelemetry()
  const now = useNow(5000)
  const [filter, setFilter] = useState<Filter>('all')
  const isLive = mode === 'live'

  const match = (f: Filter) => (a: Alert) => (f === 'all' ? true : f === 'active' ? isOpen(a) : a.severity === f)
  const shown = useMemo(() => alerts.filter(match(filter)), [alerts, filter])
  const count = (f: Filter) => alerts.filter(match(f)).length

  return (
    <>
      <PageHeader title="Alerts">
        <button
          type="button"
          onClick={clearAlerts}
          disabled={alerts.length === 0}
          title={isLive ? 'Removes cleared alerts; active alerts stay until a reading clears them' : 'Clear the demo alert log'}
          className="h-9 rounded-full border border-line bg-paper px-4 text-[12.5px] text-ink-2 hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear log
        </button>
      </PageHeader>

      <Surface aria-label="Alert log" className="overflow-hidden">
        <div role="tablist" aria-label="Filter alerts" className="flex gap-6 border-b border-line px-6">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                '-mb-px border-b-2 py-3.5 text-[13.5px] transition-colors',
                filter === f.id ? 'border-accent font-medium text-ink' : 'border-transparent text-ink-3 hover:text-ink-2',
              )}
            >
              {f.label}
              <span className="tnum ml-1.5 text-ink-3">{count(f.id)}</span>
            </button>
          ))}
          <p className="ml-auto hidden self-center text-[12px] text-ink-3 sm:block">
            {isLive ? (
              <>
                Live alerts from the ESP32 · this session
                {snapshot?.stale && <span className="text-warn"> · disconnected, states may be out of date</span>}
              </>
            ) : (
              'Demo alerts · simulated'
            )}
          </p>
        </div>

        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center" role="status">
            <Inbox className="size-5 text-ink-3" strokeWidth={1.5} aria-hidden />
            <p className="text-[14px] font-medium text-ink-2">No alerts here</p>
            <p className="text-[13px] text-ink-3">
              {isLive
                ? 'Alerts appear when the flame sensor detects a flame, the rain sensor turns wet, or temperature crosses its limit.'
                : 'Alerts appear when a demo scenario pushes a sensor past its threshold.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line py-1">
            <AnimatePresence initial={false}>
              {shown.map((a) => (
                <AlertItem key={a.id} alert={a} now={now} showSeverity showState />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Surface>
    </>
  )
}
