import { PageHeader } from '../components/layout/PageHeader'
import { ScenarioControls } from '../components/layout/ScenarioControls'
import { AttentionPanel } from '../components/overview/AttentionPanel'
import { RiskBriefing } from '../components/overview/RiskBriefing'
import { SensorHealth } from '../components/overview/SensorHealth'
import { TrendBars } from '../components/overview/TrendBars'
import { Skeleton } from '../components/ui/primitives'
import { useTelemetry } from '../context/telemetryContext'
import type { RouteId } from '../hooks/useHashRoute'

/**
 * Asymmetric bento layout after the reference:
 *   [ dark risk briefing (≈60%) ] [ needs attention (≈40%, spans both rows) ]
 *   [ trends ] [ sensor health ]  [                                          ]
 */
export function OverviewPage({ onNavigate }: { onNavigate: (r: RouteId) => void }) {
  const { snapshot } = useTelemetry()

  return (
    <>
      <PageHeader title="Environmental intelligence, at a glance">
        <ScenarioControls />
      </PageHeader>

      {!snapshot ? (
        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]" aria-busy="true">
          <p className="sr-only">Starting the demo data feed…</p>
          <div className="space-y-4">
            <Skeleton className="h-[340px]" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-[260px]" />
              <Skeleton className="h-[260px]" />
            </div>
          </div>
          <Skeleton className="h-[620px]" />
        </div>
      ) : (
        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] 2xl:gap-5 short:gap-3">
          <div className="flex min-w-0 flex-col gap-4 2xl:gap-5 short:gap-3">
            <div className="flex lg:flex-[1.1_1_0%]">
              <RiskBriefing snapshot={snapshot} />
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:flex-[1_1_0%] 2xl:gap-5 short:gap-3">
              <TrendBars history={snapshot.history} mode={snapshot.mode} stale={snapshot.stale} />
              <SensorHealth snapshot={snapshot} onOpen={() => onNavigate('monitoring')} />
            </div>
          </div>
          {/* On desktop the left column sets the row height; this panel fills it
              (absolute) and scrolls its list internally instead of pushing the page. */}
          <div className="relative flex min-w-0 lg:min-h-[560px]">
            <div className="flex w-full lg:absolute lg:inset-0">
              <AttentionPanel
                snapshot={snapshot}
                onOpenAlerts={() => onNavigate('alerts')}
                onOpenMonitoring={() => onNavigate('monitoring')}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
