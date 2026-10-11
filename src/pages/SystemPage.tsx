import { ArrowRight } from 'lucide-react'
import { Fragment } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { SectionHeader, Surface } from '../components/ui/primitives'
import { useTelemetry } from '../context/telemetryContext'
import { SAMPLE_INTERVAL_MS } from '../data/mockSource'
import { cn } from '../lib/cn'
import { SENSOR_META, SENSOR_ORDER } from '../lib/evaluate'

type StepState = 'active' | 'pending'

export function SystemPage() {
  const { connection, sourceKind } = useTelemetry()
  const simulated = sourceKind === 'simulated'

  const pipeline: { title: string; detail: string; state: StepState }[] = [
    { title: 'Sensors', detail: simulated ? 'Simulated readings' : 'Hardware', state: 'active' },
    { title: 'ESP32 edge node', detail: simulated ? 'Not connected' : 'Connected', state: simulated ? 'pending' : 'active' },
    { title: 'Risk assessment', detail: 'Rule-based thresholds', state: 'active' },
    { title: 'Dashboard', detail: connection === 'live' ? 'Receiving data' : 'Starting…', state: connection === 'live' ? 'active' : 'pending' },
  ]

  const details: [string, string][] = [
    ['Data source', simulated ? 'Built-in simulator' : 'ESP32 telemetry'],
    ['ESP32 connection', simulated ? 'Not connected' : 'Connected'],
    ['Sample interval', `${SAMPLE_INTERVAL_MS / 1000} seconds`],
    ['Assessment method', 'Threshold rules per sensor, combined into one risk index'],
    ['Alerting', 'Raised when a sensor crosses its warning or critical threshold'],
  ]

  return (
    <>
      <PageHeader title="System" />

      <div className="space-y-5">
        <Surface aria-labelledby="pipeline-heading">
          <SectionHeader id="pipeline-heading" title="Data pipeline" />
          <ol className="flex flex-col gap-3 px-6 pb-6 md:flex-row md:items-center">
            {pipeline.map((s, i) => (
              <Fragment key={s.title}>
                <li className="flex-1 rounded-[14px] border border-line bg-mist/60 px-4 py-3.5">
                  <p className="flex items-center gap-2 text-[14px] font-medium text-ink">
                    <span className={cn('size-1.5 rounded-full', s.state === 'active' ? 'bg-accent' : 'bg-warn')} aria-hidden />
                    {s.title}
                  </p>
                  <p className={cn('mt-0.5 pl-3.5 text-[13px]', s.state === 'active' ? 'text-ink-3' : 'text-warn')}>{s.detail}</p>
                </li>
                {i < pipeline.length - 1 && <ArrowRight className="mx-auto size-4 shrink-0 rotate-90 text-line-strong md:rotate-0" aria-hidden />}
              </Fragment>
            ))}
          </ol>
        </Surface>

        <div className="grid gap-5 lg:grid-cols-2">
          <Surface aria-labelledby="status-heading">
            <SectionHeader id="status-heading" title="Monitoring status" />
            <dl className="divide-y divide-line border-t border-line">
              {details.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[150px_1fr] gap-4 px-6 py-3.5 text-[13.5px]">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Surface>

          <Surface aria-labelledby="hardware-heading">
            <SectionHeader id="hardware-heading" title="Sensor hardware" meta="Planned for the ESP32 prototype" />
            <ul className="divide-y divide-line border-t border-line">
              {SENSOR_ORDER.map((id) => (
                <li key={id} className="grid grid-cols-[150px_1fr] gap-4 px-6 py-3.5 text-[13.5px]">
                  <span className="text-ink-3">{SENSOR_META[id].name}</span>
                  <span className="text-ink">{SENSOR_META[id].device}</span>
                </li>
              ))}
            </ul>
          </Surface>
        </div>
      </div>
    </>
  )
}
