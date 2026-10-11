import { createContext, useContext } from 'react'
import type { Alert, ConnectionState, ScenarioId, TelemetrySnapshot } from '../types/telemetry'

export interface TelemetryContextValue {
  snapshot: TelemetrySnapshot | null
  alerts: Alert[]
  connection: ConnectionState
  sourceKind: 'simulated' | 'live'
  scenario: ScenarioId
  setScenario: (id: ScenarioId) => void
  /** Restore normal conditions and clear the alert log */
  reset: () => void
  clearAlerts: () => void
  acknowledge: (id: string) => void
}

export const TelemetryContext = createContext<TelemetryContextValue | null>(null)

export function useTelemetry(): TelemetryContextValue {
  const ctx = useContext(TelemetryContext)
  if (!ctx) throw new Error('useTelemetry must be used inside <TelemetryProvider>')
  return ctx
}
