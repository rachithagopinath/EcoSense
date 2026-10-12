import { evaluateSensors, historyPoint, overallStatus, SENSOR_ORDER, sensorValue } from '../lib/evaluate'
import type { HistoryPoint, ScenarioId, SensorId, SensorReading, TelemetrySnapshot } from '../types/telemetry'
import { SCENARIOS } from './scenarios'
import type { TelemetryListener, TelemetrySource } from './telemetrySource'

/** How often a new simulated reading is produced. */
export const SAMPLE_INTERVAL_MS = 1500
/** Samples kept for the trend chart (~2 minutes). */
export const HISTORY_LENGTH = 80

/** Fraction of the gap to the scenario target closed each tick (~5 s to settle). */
const DRIFT_RATE = 0.35

type Key = keyof SensorReading

/** [min, max, noise amplitude] per reading */
const SPEC: Record<Key, [number, number, number]> = {
  flameIntensity: [0, 100, 0.8],
  rainLevel: [0, 100, 0.9],
  airPpm: [350, 2000, 9],
  temperature: [10, 60, 0.15],
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d

function step(current: SensorReading, target: SensorReading, rate: number): SensorReading {
  const next = { ...current }
  for (const key of Object.keys(SPEC) as Key[]) {
    const [lo, hi, noise] = SPEC[key]
    const v = current[key] + (target[key] - current[key]) * rate + (Math.random() - 0.5) * 2 * noise
    next[key] = round(Math.min(hi, Math.max(lo, v)), key === 'temperature' ? 1 : 0)
  }
  return next
}

const valuesOf = (r: SensorReading) =>
  Object.fromEntries(SENSOR_ORDER.map((id) => [id, sensorValue(id, r)])) as Record<SensorId, number>

/** Build a demo snapshot from a simulated reading and its history. */
export function buildSnapshot(reading: SensorReading, history: HistoryPoint[], timestamp = Date.now()): TelemetrySnapshot {
  const sensors = evaluateSensors(reading)
  return { mode: 'demo', timestamp, stale: false, sensors, overall: overallStatus(sensors), history, live: null }
}

/** Simulated four-sensor source with scenario control for the demo. */
export class MockTelemetrySource implements TelemetrySource {
  readonly kind = 'simulated' as const

  private listeners = new Set<TelemetryListener>()
  private timer: ReturnType<typeof setInterval> | null = null
  private scenario: ScenarioId = 'normal'
  private reading: SensorReading = { ...SCENARIOS.normal.targets }
  private history: HistoryPoint[] = []

  constructor() {
    this.backfill()
  }

  connect() {
    if (!this.timer) this.timer = setInterval(() => this.tick(), SAMPLE_INTERVAL_MS)
  }

  disconnect() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  subscribe(listener: TelemetryListener) {
    this.listeners.add(listener)
    listener(this.snapshot())
    return () => {
      this.listeners.delete(listener)
    }
  }

  setScenario(id: ScenarioId) {
    this.scenario = id
    this.tick() // respond immediately to the selection
  }

  /** Back to normal conditions with a clean history. */
  reset() {
    this.scenario = 'normal'
    this.reading = { ...SCENARIOS.normal.targets }
    this.backfill()
    this.emit()
  }

  private backfill() {
    const now = Date.now()
    this.history = []
    for (let i = HISTORY_LENGTH - 1; i >= 0; i--) {
      this.reading = step(this.reading, SCENARIOS.normal.targets, 0.5)
      this.history.push(this.point(now - i * SAMPLE_INTERVAL_MS))
    }
  }

  private point(t: number): HistoryPoint {
    const sensors = evaluateSensors(this.reading)
    return historyPoint(t, sensors, overallStatus(sensors), valuesOf(this.reading))
  }

  private tick() {
    this.reading = step(this.reading, SCENARIOS[this.scenario].targets, DRIFT_RATE)
    this.history = [...this.history.slice(-(HISTORY_LENGTH - 1)), this.point(Date.now())]
    this.emit()
  }

  private snapshot() {
    return buildSnapshot(this.reading, this.history, this.history[this.history.length - 1]?.t)
  }

  private emit() {
    const snap = this.snapshot()
    this.listeners.forEach((l) => l(snap))
  }
}
