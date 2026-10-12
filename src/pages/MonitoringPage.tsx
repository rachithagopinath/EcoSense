import { PageHeader } from '../components/layout/PageHeader'
import { ScenarioControls } from '../components/layout/ScenarioControls'
import { Skeleton, StatusText, Surface } from '../components/ui/primitives'
import { Sparkline } from '../components/ui/Sparkline'
import { useTelemetry } from '../context/telemetryContext'
import { cn } from '../lib/cn'
import { RULES, SENSOR_META, SENSOR_ORDER } from '../lib/evaluate'
import { LIVE_DEVICE, LIVE_RULE_TEXT } from '../lib/live'
import { SENSOR_ICON } from '../lib/sensorIcons'
import { LEVEL_STYLE } from '../lib/status'

const MIN_SPAN = { fire: 20, flood: 20, air: 200, temperature: 4 } as const
/** Live units: flame 0/1, rain raw ADC 0–4095 */
const LIVE_MIN_SPAN = { fire: 1, flood: 400, air: 200, temperature: 2 } as const

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
            {['Sensor', 'Reading', snapshot.mode === 'live' ? 'This session' : 'Last 2 minutes', 'Thresholds'].map((h) => (
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
              const isLive = snapshot.mode === 'live'
              const liveRule = LIVE_RULE_TEXT[id]
              const values = snapshot.history.map((p) => p.sensors[id].value).filter((v): v is number => v !== null)
              return (
                <li
                  key={id}
                  className={cn(
                    'grid gap-4 px-6 py-6 transition-colors duration-500 md:grid-cols-[1.4fr_1fr_1.4fr_1fr] md:items-center md:gap-6',
                    status.available && status.level !== 'safe' && LEVEL_STYLE[status.level].soft,
                    snapshot.stale && 'opacity-80',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-full border border-line bg-paper">
                      <Icon className="size-4 text-ink-2" strokeWidth={1.75} aria-hidden />
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold text-ink">{meta.name}</p>
                      <p className="text-[12.5px] text-ink-3">{isLive ? LIVE_DEVICE[id] : meta.device}</p>
                    </div>
                  </div>
                  <div>
                    <p className="flex items-baseline gap-1">
                      <span className="tnum text-[26px] leading-none font-semibold tracking-[-0.03em]">{status.display}</span>
                      <span className="text-[13px] text-ink-3">{status.available ? status.unit : ''}</span>
                    </p>
                    {status.available ? (
                      <StatusText level={status.level} label={status.label} className="mt-2" />
                    ) : (
                      <p className="mt-2 text-[13px] text-ink-3">{status.label}</p>
                    )}
                  </div>
                  {values.length > 1 ? (
                    <Sparkline
                      values={values}
                      color={!status.available || status.level === 'safe' ? 'var(--color-ink)' : LEVEL_STYLE[status.level].color}
                      height={40}
                      minSpan={isLive ? LIVE_MIN_SPAN[id] : MIN_SPAN[id]}
                      ariaLabel={`${meta.name} over ${isLive ? 'this session' : 'the last two minutes'}`}
                    />
                  ) : (
                    <p className="text-[12.5px] text-ink-3">{isLive && id !== 'air' ? 'Collecting readings…' : 'No data'}</p>
                  )}
                  {isLive ? (
                    <dl className="tnum grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12.5px]">
                      {liveRule.warning && (
                        <>
                          <dt className="text-warn">Warning</dt>
                          <dd className="text-ink-2">{liveRule.warning}</dd>
                        </>
                      )}
                      {liveRule.critical && (
                        <>
                          <dt className="text-crit">Critical</dt>
                          <dd className="text-ink-2">{liveRule.critical}</dd>
                        </>
                      )}
                      {!liveRule.warning && !liveRule.critical && <dd className="col-span-2 text-ink-3">{liveRule.alert}</dd>}
                    </dl>
                  ) : (
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
                  )}
                </li>
              )
            })}
          </ul>
        </Surface>
      )}
    </>
  )
}
