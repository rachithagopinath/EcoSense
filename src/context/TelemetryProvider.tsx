import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MockTelemetrySource } from '../data/mockSource'
import { isWebSerialSupported, SerialTelemetrySource } from '../data/serialSource'
import { detectAlerts, initialLatch, mergeAlerts, type AlertLatch } from '../lib/alerts'
import type { Alert, ConnectionState, DataMode, LiveConnection, ScenarioId, TelemetrySnapshot } from '../types/telemetry'
import { TelemetryContext, type TelemetryContextValue } from './telemetryContext'

const MAX_ALERTS = 40
/** Short "connecting" phase so the demo loading state is visible and honest. */
const CONNECT_DELAY_MS = 600

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const [demo] = useState(() => new MockTelemetrySource())
  const [serial] = useState(() => new SerialTelemetrySource())
  const serialSupported = useMemo(() => isWebSerialSupported(), [])

  const [mode, setMode] = useState<DataMode>('demo')
  const modeRef = useRef<DataMode>('demo')

  const [demoSnapshot, setDemoSnapshot] = useState<TelemetrySnapshot | null>(null)
  const [liveSnapshot, setLiveSnapshot] = useState<TelemetrySnapshot | null>(null)
  const [demoAlerts, setDemoAlerts] = useState<Alert[]>([])
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>([])
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const [live, setLive] = useState<LiveConnection>(() => serial.getConnection())
  const [scenario, setScenarioState] = useState<ScenarioId>('normal')
  const demoLatch = useRef<AlertLatch>(initialLatch())
  const liveLatch = useRef<AlertLatch>(initialLatch())

  const enterMode = useCallback(
    (next: DataMode) => {
      modeRef.current = next
      setMode(next)
      // The simulator only runs in demo mode, so it can never overwrite live readings.
      if (next === 'demo') demo.connect()
      else demo.disconnect()
    },
    [demo],
  )

  // Demo feed
  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    const timer = setTimeout(() => {
      unsubscribe = demo.subscribe((snap) => {
        setDemoSnapshot(snap)
        const { alerts: fresh, latch } = detectAlerts(snap.sensors, demoLatch.current, snap.timestamp, 'demo')
        demoLatch.current = latch
        if (fresh.length) setDemoAlerts((prev) => mergeAlerts(prev, fresh, MAX_ALERTS))
      })
      if (modeRef.current === 'demo') demo.connect()
      setConnection('live')
    }, CONNECT_DELAY_MS)
    return () => {
      clearTimeout(timer)
      unsubscribe?.()
      demo.disconnect()
    }
  }, [demo])

  // Live feed (ESP32 over USB serial)
  useEffect(() => {
    serial.setCallbacks({
      onConnection: setLive,
      onSnapshot: (snap) => {
        setLiveSnapshot(snap)
        // Only fresh readings can raise or clear alerts; stale/waiting snapshots never do.
        if (snap.stale || !snap.overall.known) return
        const { alerts: fresh, latch } = detectAlerts(snap.sensors, liveLatch.current, snap.timestamp, 'live')
        liveLatch.current = latch
        if (fresh.length) setLiveAlerts((prev) => mergeAlerts(prev, fresh, MAX_ALERTS))
      },
    })
    return () => {
      serial.setCallbacks(null)
      void serial.disconnect()
    }
  }, [serial])

  const connectEsp32 = useCallback(async () => {
    const opened = await serial.connect()
    if (opened) enterMode('live')
  }, [serial, enterMode])

  const disconnectEsp32 = useCallback(async () => {
    await serial.disconnect()
  }, [serial])

  const switchToDemo = useCallback(async () => {
    if (serial.isOpen) await serial.disconnect()
    enterMode('demo')
  }, [serial, enterMode])

  const setScenario = useCallback(
    (id: ScenarioId) => {
      if (modeRef.current !== 'demo') return
      setScenarioState(id)
      demo.setScenario(id)
    },
    [demo],
  )

  const reset = useCallback(() => {
    if (modeRef.current !== 'demo') return
    demoLatch.current = initialLatch()
    setScenarioState('normal')
    demo.reset()
    setDemoAlerts([])
  }, [demo])

  const clearAlerts = useCallback(() => {
    if (modeRef.current === 'demo') setDemoAlerts([])
    else setLiveAlerts((prev) => prev.filter((a) => !a.cleared && a.severity !== 'resolved')) // keep open alerts
  }, [])

  const acknowledge = useCallback((id: string) => {
    const ack = (prev: Alert[]) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    if (modeRef.current === 'demo') setDemoAlerts(ack)
    else setLiveAlerts(ack)
  }, [])

  const snapshot = mode === 'demo' ? demoSnapshot : liveSnapshot
  const alerts = mode === 'demo' ? demoAlerts : liveAlerts

  const value = useMemo<TelemetryContextValue>(
    () => ({
      snapshot,
      alerts,
      connection,
      mode,
      live,
      serialSupported,
      connectEsp32,
      disconnectEsp32,
      switchToDemo,
      scenario,
      setScenario,
      reset,
      clearAlerts,
      acknowledge,
    }),
    [snapshot, alerts, connection, mode, live, serialSupported, connectEsp32, disconnectEsp32, switchToDemo, scenario, setScenario, reset, clearAlerts, acknowledge],
  )

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>
}
