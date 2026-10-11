import { PageHeader } from '../components/layout/PageHeader'
import { ScenarioControls } from '../components/layout/ScenarioControls'
import { Skeleton, StatusText, Surface } from '../components/ui/primitives'
import { Sparkline } from '../components/ui/Sparkline'
import { useTelemetry } from '../context/telemetryContext'
import { cn } from '../lib/cn'
import { RULES, SENSOR_META, SENSOR_ORDER, sensorValue } from '../lib/evaluate'
import { formatReading } from '../lib/format'
import { SENSOR_ICON } from '../lib/sensorIcons'
import { LEVEL_STYLE } from '../lib/status'

const MIN_SPAN = { fire: 20, flood: 20, air: 200, temperature: 4 } as const

export function MonitoringPage() {
  const { snapshot } = useTelemetry()

  return (
    <>
      <PageHeader title="Monitoring">
        <ScenarioControls />
      </PageHeader>

      {!snapshot ? (
        <Skeleton className="h-[440px]" />
      ) : (
        <Surface aria-label="Sensor readings" className="overflow-hidden">
          <div className="hidden grid-cols-[1.4fr_1fr_1.4fr_1fr] gap-6 border-b border-line px-6 py-3 md:grid">
            {['Sensor', 'Reading', 'Last 2 minutes', 'Thresholds'].map((h) => (
              <p key={h} className="eyebrow">
                {h}
              </p>
            ))}
          </div>
          <ul className="divide-y divide-line">
            {SENSOR_ORDER.map((id) => {
              const meta = SENSOR_META[id]
              const status = snapshot.sensors[id]
              const Icon = SENSOR_ICON[id]
              const rule = RULES[id]
              const values = snapshot.history.map((p) => sensorValue(id, p))
              return (
                <li
                  key={id}
                  className={cn(
                    'grid gap-4 px-6 py-6 transition-colors duration-500 md:grid-cols-[1.4fr_1fr_1.4fr_1fr] md:items-center md:gap-6',
                    status.level !== 'safe' && LEVEL_STYLE[status.level].soft,
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-full border border-line bg-paper">
                      <Icon className="size-4 text-ink-2" strokeWidth={1.75} aria-hidden />
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold text-ink">{meta.name}</p>
                      <p className="text-[12.5px] text-ink-3">{meta.device}</p>
                    </div>
                  </div>
                  <div>
                    <p className="flex items-baseline gap-1">
                      <span className="tnum text-[26px] leading-none font-semibold tracking-[-0.03em]">{formatReading(id, snapshot.reading)}</span>
                      <span className="text-[13px] text-ink-3">{meta.unit}</span>
                    </p>
                    <StatusText level={status.level} label={status.label} className="mt-2" />
                  </div>
                  <Sparkline
                    values={values}
                    color={status.level === 'safe' ? 'var(--color-ink)' : LEVEL_STYLE[status.level].color}
                    height={40}
                    minSpan={MIN_SPAN[id]}
                    ariaLabel={`${meta.name} over the last two minutes`}
                  />
                  <dl className="tnum grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12.5px]">
                    <dt className="text-warn">Warning</dt>
                    <dd className="text-ink-2">
                      ≥ {rule.warning} {meta.unit}
                    </dd>
                    <dt className="text-crit">Critical</dt>
                    <dd className="text-ink-2">
                      ≥ {rule.critical} {meta.unit}
                    </dd>
                  </dl>
                </li>
              )
            })}
          </ul>
        </Surface>
      )}
    </>
  )
}
