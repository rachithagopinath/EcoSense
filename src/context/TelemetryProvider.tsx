import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MockTelemetrySource } from '../data/mockSource'
import { detectAlerts, initialLatch, type AlertLatch } from '../lib/alerts'
import type { Alert, ConnectionState, ScenarioId, TelemetrySnapshot } from '../types/telemetry'
import { TelemetryContext, type TelemetryContextValue } from './telemetryContext'

const MAX_ALERTS = 40
/** Short "connecting" phase so the loading state is visible and honest. */
const CONNECT_DELAY_MS = 600

export function TelemetryProvider({ children }: { children: ReactNode }) {
  // Swap this for an ESP32-backed TelemetrySource once the hardware is connected.
  const [source] = useState(() => new MockTelemetrySource())

  const [snapshot, setSnapshot] = useState<TelemetrySnapshot | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const [scenario, setScenarioState] = useState<ScenarioId>('normal')
  const latchRef = useRef<AlertLatch>(initialLatch())

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    const timer = setTimeout(() => {
      unsubscribe = source.subscribe((snap) => {
        setSnapshot(snap)
        const { alerts: fresh, latch } = detectAlerts(snap.sensors, latchRef.current, snap.timestamp)
        latchRef.current = latch
        if (fresh.length) {
          // A newer alert (or recovery) for a sensor clears that sensor's older alerts.
          const touched = new Set(fresh.map((a) => a.sensor))
          setAlerts((prev) =>
            [...[...fresh].reverse(), ...prev.map((a) => (touched.has(a.sensor) && !a.cleared ? { ...a, cleared: true } : a))].slice(
              0,
              MAX_ALERTS,
            ),
          )
        }
      })
      source.connect()
      setConnection('live')
    }, CONNECT_DELAY_MS)
    return () => {
      clearTimeout(timer)
      unsubscribe?.()
      source.disconnect()
    }
  }, [source])

  const setScenario = useCallback(
    (id: ScenarioId) => {
      setScenarioState(id)
      source.setScenario(id)
    },
    [source],
  )

  const reset = useCallback(() => {
    latchRef.current = initialLatch()
    setScenarioState('normal')
    source.reset()
    setAlerts([])
  }, [source])

  const clearAlerts = useCallback(() => setAlerts([]), [])

  const acknowledge = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)))
  }, [])

  const value = useMemo<TelemetryContextValue>(
    () => ({ snapshot, alerts, connection, sourceKind: source.kind, scenario, setScenario, reset, clearAlerts, acknowledge }),
    [snapshot, alerts, connection, source.kind, scenario, setScenario, reset, clearAlerts, acknowledge],
  )

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>
}
