/**
 * Domain types for EcoSense.
 *
 * These shapes are the contract between the data sources and the UI. Both the
 * demo simulator (data/mockSource.ts) and the live ESP32 serial source
 * (data/serialSource.ts) produce the same TelemetrySnapshot.
 */

/** The three states used throughout the UI. */
export type StatusLevel = 'safe' | 'warning' | 'critical'

export type SensorId = 'fire' | 'flood' | 'air' | 'temperature'

/** Where the readings on screen come from. Demo data must never be labelled live. */
export type DataMode = 'demo' | 'live'

/** One sample from the simulated four-sensor array (demo mode only). */
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

/**
 * One validated record received from the ESP32 over USB serial.
 * A field is null when the device did not send it or reported a failed read.
 */
export interface LiveRecord {
  /** DHT11 temperature, °C */
  temperature: number | null
  /** DHT11 relative humidity, % */
  humidity: number | null
  /** Raindrop sensor analogue value, 0–4095 (lower = wetter) */
  rainRaw: number | null
  /** Wet/dry decision (from the device, or derived from rainRaw ≤ threshold) */
  rainDetected: boolean | null
  /** KY-026 digital output as read on GPIO 27 (0 or 1) */
  flameRaw: number | null
  /** Flame decision from the device, using the verified D0 polarity */
  flameDetected: boolean | null
  /** Device uptime in ms, if sent */
  uptimeMs: number | null
}

/** Rule-based assessment of one sensor. */
export interface SensorStatus {
  id: SensorId
  /** False when the sensor is not connected, its reading failed, or no data has arrived yet. */
  available: boolean
  /** Only meaningful when `available` is true. */
  level: StatusLevel
  /** 0–100 risk contribution (demo only; null for live sensors) */
  score: number | null
  /** Short plain-language state, e.g. "No flame" or "Wet" */
  label: string
  /** One sentence used in summaries and alerts */
  reason: string
  /** Formatted current value, e.g. "1,443" or "28.5"; "—" when unavailable */
  display: string
  /** Unit for `display`, may be empty */
  unit: string
  /** One-line context under the sensor name, e.g. "Rain sensor · 1,443 raw" */
  detail: string
  /** Compact value for the radial map callout, e.g. "3%", "Wet", "28.5°" */
  short: string
}

export interface OverallStatus {
  level: StatusLevel
  /** False when there is not yet any reading to assess (live, waiting for data). */
  known: boolean
  /** 0–100 overall risk index (demo). Null in live mode, where no index is derived. */
  riskIndex: number | null
  /** Sensors currently at warning or critical, most serious first */
  activeHazards: SensorId[]
  /** Sensors with a current, valid reading */
  availableCount: number
  headline: string
  explanation: string
  /** Live only: what this assessment does not cover (e.g. sensors not connected) */
  caveat?: string
  /** Live only: recommended action, kept apart so a stale view can omit it */
  advice?: string
}

export type AlertSeverity = 'warning' | 'critical' | 'resolved'

export interface Alert {
  id: string
  /** Short human-readable reference, e.g. "AL-007" */
  ref: string
  /** When the condition was first detected */
  timestamp: number
  sensor: SensorId
  severity: AlertSeverity
  title: string
  message: string
  /** Operator has acknowledged it */
  acknowledged: boolean
  /** Superseded by a newer alert for the same sensor, or the sensor recovered */
  cleared: boolean
  /** When the condition cleared (from a real reading), if it has */
  clearedAt?: number
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

/** Per-sensor values stored in history. */
export interface PointSensor {
  /** Null when the sensor had no valid reading at that time */
  level: StatusLevel | null
  /** 0–100 score (demo only) */
  score: number | null
  /** Numeric value for sparklines (demo value, live rain raw, flame 0/1, temperature) */
  value: number | null
}

/** A point in the short rolling history used by the trend chart and radial map. */
export interface HistoryPoint {
  t: number
  /** Demo only; null in live mode */
  riskIndex: number | null
  /** Number of sensors at warning or critical */
  activeCount: number
  sensors: Record<SensorId, PointSensor>
}

/** Everything the UI needs, delivered on every tick / received line. */
export interface TelemetrySnapshot {
  mode: DataMode
  /** Time of the reading shown (not the time it was rendered) */
  timestamp: number
  /** Live only: the device is disconnected or silent, values are the last ones received */
  stale: boolean
  sensors: Record<SensorId, SensorStatus>
  overall: OverallStatus
  history: HistoryPoint[]
  /** Live only: the last raw record from the ESP32 */
  live: LiveRecord | null
}

/** State of the USB serial link to the ESP32. */
export type LiveStatus =
  | 'idle' // never connected this session
  | 'unsupported' // browser has no Web Serial
  | 'connecting' // port picker open / port opening
  | 'waiting' // port open, no valid record yet
  | 'live' // port open, receiving valid records
  | 'stale' // port open, but no valid record recently
  | 'disconnected' // port closed by user or lost (cable unplugged)
  | 'error' // could not open the port

export interface LiveConnection {
  status: LiveStatus
  /** Human-readable detail for errors and diagnostics */
  message: string | null
  /** Time the last valid record was received */
  lastUpdate: number | null
  /** Valid EcoSense records received since connecting */
  validLines: number
  /** Lines ignored (boot messages, debug output, malformed JSON) */
  ignoredLines: number
}
