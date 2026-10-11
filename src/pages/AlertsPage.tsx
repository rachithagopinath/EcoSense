import { AnimatePresence } from 'framer-motion'
import { Inbox } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AlertItem } from '../components/alerts/AlertItem'
import { PageHeader } from '../components/layout/PageHeader'
import { Surface } from '../components/ui/primitives'
import { useTelemetry } from '../context/telemetryContext'
import { useNow } from '../hooks/useNow'
import { cn } from '../lib/cn'
import type { AlertSeverity } from '../types/telemetry'

type Filter = 'all' | AlertSeverity

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'critical', label: 'Critical' },
  { id: 'warning', label: 'Warning' },
  { id: 'resolved', label: 'Resolved' },
]

export function AlertsPage() {
  const { alerts, clearAlerts } = useTelemetry()
  const now = useNow(5000)
  const [filter, setFilter] = useState<Filter>('all')

  const shown = useMemo(() => (filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter)), [alerts, filter])
  const count = (f: Filter) => (f === 'all' ? alerts.length : alerts.filter((a) => a.severity === f).length)

  return (
    <>
      <PageHeader title="Alerts">
        <button
          type="button"
          onClick={clearAlerts}
          disabled={alerts.length === 0}
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
        </div>

        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center" role="status">
            <Inbox className="size-5 text-ink-3" strokeWidth={1.5} aria-hidden />
            <p className="text-[14px] font-medium text-ink-2">No alerts here</p>
            <p className="text-[13px] text-ink-3">Alerts appear when a demo scenario pushes a sensor past its threshold.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line py-1">
            <AnimatePresence initial={false}>
              {shown.map((a) => (
                <AlertItem key={a.id} alert={a} now={now} showSeverity />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Surface>
    </>
  )
}
