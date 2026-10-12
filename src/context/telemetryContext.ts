import { createContext, useContext } from 'react'
import type { Alert, ConnectionState, DataMode, LiveConnection, ScenarioId, TelemetrySnapshot } from '../types/telemetry'

export interface TelemetryContextValue {
  /** Snapshot for the current mode. Demo and live data are never mixed. */
  snapshot: TelemetrySnapshot | null
  /** Alert log for the current mode */
  alerts: Alert[]
  /** Demo feed start-up state */
  connection: ConnectionState
  /** 'demo' = simulated readings; 'live' = readings from the ESP32 only */
  mode: DataMode
  /** USB serial link state */
  live: LiveConnection
  serialSupported: boolean
  /** Opens the browser's port picker (must be called from a click). */
  connectEsp32: () => Promise<void>
  /** Closes the port. Stays in live mode showing the last reading as stale. */
  disconnectEsp32: () => Promise<void>
  /** Leave live mode and show simulated data, clearly labelled. */
  switchToDemo: () => Promise<void>
  // Demo controls (no effect in live mode)
  scenario: ScenarioId
  setScenario: (id: ScenarioId) => void
  /** Restore normal demo conditions and clear the demo alert log */
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
