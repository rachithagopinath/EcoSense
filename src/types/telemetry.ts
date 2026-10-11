/**
 * Domain types for EcoSense.
 *
 * These shapes are the contract between the data layer and the UI. When the
 * simulator is replaced by real ESP32 telemetry, the new source only needs to
 * produce these same types.
 */

/** The three states used throughout the UI. */
export type StatusLevel = 'safe' | 'warning' | 'critical'

export type SensorId = 'fire' | 'flood' | 'air' | 'temperature'

/** One sample from the four-sensor array. */
export interface SensorReading {
  /** Flame sensor IR intensity, 0–100 % (analog output) */
  flameIntensity: number
  /** Rain sensor wetness, 0–100 % (analog output) */
  rainLevel: number
  /** MQ-135 gas concentration, ppm (CO₂-equivalent) */
  airPpm: number
  /** DHT11 ambient temperature, °C */
  temperature: number
}

/** Rule-based assessment of one sensor. */
export interface SensorStatus {
  id: SensorId
  level: StatusLevel
  /** 0–100 risk contribution from this sensor */
  score: number
  /** Short plain-language state, e.g. "No flame" or "Heavy rain" */
  label: string
  /** One sentence used in summaries and alerts */
  reason: string
}

export interface OverallStatus {
  level: StatusLevel
  /** 0–100 overall risk index */
  riskIndex: number
  /** Sensors currently at warning or critical, most serious first */
  activeHazards: SensorId[]
  headline: string
  explanation: string
}

export type AlertSeverity = 'warning' | 'critical' | 'resolved'

export interface Alert {
  id: string
  /** Short human-readable reference, e.g. "AL-007" */
  ref: string
  timestamp: number
  sensor: SensorId
  severity: AlertSeverity
  title: string
  message: string
  /** Operator has acknowledged it */
  acknowledged: boolean
  /** Superseded by a newer alert for the same sensor, or the sensor recovered */
  cleared: boolean
}

export type ScenarioId = 'normal' | 'fire' | 'flood' | 'air' | 'multi'

export interface Scenario {
  id: ScenarioId
  label: string
  description: string
  /** Values the simulator moves toward */
  targets: SensorReading
}

export type ConnectionState = 'connecting' | 'live'

/** A point in the short rolling history used by the trend chart. */
export interface HistoryPoint extends SensorReading {
  t: number
  riskIndex: number
}

/** Everything the UI needs, delivered on every simulated tick. */
export interface TelemetrySnapshot {
  timestamp: number
  reading: SensorReading
  sensors: Record<SensorId, SensorStatus>
  overall: OverallStatus
  history: HistoryPoint[]
}
