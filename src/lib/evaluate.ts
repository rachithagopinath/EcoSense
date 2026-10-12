import type { HistoryPoint, OverallStatus, SensorId, SensorReading, SensorStatus, StatusLevel } from '../types/telemetry'

/**
 * Threshold rules for each sensor.
 *
 * This is transparent rule-based logic, not a trained model. The same rules
 * are intended to run on the ESP32 at the edge.
 *
 * Each sensor maps to a 0–100 score with fixed anchor points:
 *   baseline → 0, warning threshold → 40, critical threshold → 70, max → 100
 * so the score and the status level always agree.
 */
interface Rule {
  baseline: number
  warning: number
  critical: number
  max: number
}

export const RULES: Record<SensorId, Rule> = {
  fire: { baseline: 0, warning: 30, critical: 60, max: 100 }, // flame IR intensity %
  flood: { baseline: 0, warning: 40, critical: 70, max: 100 }, // rain wetness %
  air: { baseline: 380, warning: 800, critical: 1200, max: 2000 }, // MQ-135 ppm
  temperature: { baseline: 26, warning: 38, critical: 45, max: 55 }, // °C
}

export const SCORE_WARNING = 40
export const SCORE_CRITICAL = 70

export const SENSOR_META: Record<SensorId, { name: string; device: string; unit: string; decimals: number }> = {
  fire: { name: 'Fire Detection', device: 'Flame sensor', unit: '%', decimals: 0 },
  flood: { name: 'Flood Monitoring', device: 'Rain sensor', unit: '%', decimals: 0 },
  air: { name: 'Air Quality', device: 'MQ-135', unit: 'ppm', decimals: 0 },
  temperature: { name: 'Temperature', device: 'DHT11', unit: '°C', decimals: 1 },
}

export const SENSOR_ORDER: SensorId[] = ['fire', 'flood', 'air', 'temperature']

export function sensorValue(id: SensorId, r: SensorReading): number {
  switch (id) {
    case 'fire':
      return r.flameIntensity
    case 'flood':
      return r.rainLevel
    case 'air':
      return r.airPpm
    case 'temperature':
      return r.temperature
  }
}

function scoreOf(v: number, rule: Rule): number {
  const pts: [number, number][] = [
    [rule.baseline, 0],
    [rule.warning, SCORE_WARNING],
    [rule.critical, SCORE_CRITICAL],
    [rule.max, 100],
  ]
  if (v <= pts[0][0]) return 0
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    if (v <= x1) return Math.round(y0 + ((v - x0) / (x1 - x0)) * (y1 - y0))
  }
  return 100
}

export const levelOf = (score: number): StatusLevel =>
  score >= SCORE_CRITICAL ? 'critical' : score >= SCORE_WARNING ? 'warning' : 'safe'

const TEXT: Record<SensorId, Record<StatusLevel, [label: string, reason: string]>> = {
  fire: {
    safe: ['No flame', 'No flame detected'],
    warning: ['Possible flame', 'Infrared activity near the flame sensor'],
    critical: ['Flame detected', 'Fire detected by the flame sensor'],
  },
  flood: {
    safe: ['Dry', 'Rainfall within normal range'],
    warning: ['Moderate rain', 'Rainfall is building up'],
    critical: ['Heavy rain', 'Sustained heavy rain is raising flood risk'],
  },
  air: {
    safe: ['Good', 'Air quality is good'],
    warning: ['Moderate', 'Gas concentration is rising'],
    critical: ['Poor', 'Gas concentration has reached unhealthy levels'],
  },
  temperature: {
    safe: ['Normal', 'Temperature is normal'],
    warning: ['Hot', 'Temperature is above normal'],
    critical: ['Extreme heat', 'Temperature is dangerously high'],
  },
}

export function formatNumber(v: number, decimals: number): string {
  return v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/** Demo mode: score every simulated reading against RULES. */
export function evaluateSensors(r: SensorReading): Record<SensorId, SensorStatus> {
  const out = {} as Record<SensorId, SensorStatus>
  for (const id of SENSOR_ORDER) {
    const meta = SENSOR_META[id]
    const value = sensorValue(id, r)
    const score = scoreOf(value, RULES[id])
    const level = levelOf(score)
    let [label, reason] = TEXT[id][level]
    if (id === 'flood' && level === 'safe' && r.rainLevel > 18) label = 'Light rain'
    const display = formatNumber(value, meta.decimals)
    const unitShort = meta.unit === '°C' ? '°' : meta.unit === '%' ? '%' : ''
    out[id] = {
      id,
      available: true,
      level,
      score,
      label,
      reason,
      display,
      unit: meta.unit,
      detail: `${meta.device} · ${display} ${meta.unit}`,
      short: `${display}${unitShort}`,
    }
  }
  return out
}

/** Store the per-sensor state of one moment for the trend chart and radial map. */
export function historyPoint(t: number, sensors: Record<SensorId, SensorStatus>, overall: OverallStatus, values: Record<SensorId, number | null>): HistoryPoint {
  const point = {} as HistoryPoint['sensors']
  for (const id of SENSOR_ORDER) {
    const s = sensors[id]
    point[id] = { level: s.available ? s.level : null, score: s.available ? s.score : null, value: s.available ? values[id] : null }
  }
  return { t, riskIndex: overall.riskIndex, activeCount: overall.activeHazards.length, sensors: point }
}

/**
 * Overall assessment. The most serious sensor sets the level; each extra
 * active hazard adds a little to the index to reflect compounding risk.
 */
export function overallStatus(sensors: Record<SensorId, SensorStatus>): OverallStatus {
  const ranked = [...SENSOR_ORDER].sort((a, b) => (sensors[b].score ?? 0) - (sensors[a].score ?? 0))
  const active = ranked.filter((id) => sensors[id].level !== 'safe')
  const top = sensors[ranked[0]]
  const extra = active.slice(1).reduce((s, id) => s + (sensors[id].score ?? 0) * 0.15, 0)
  const riskIndex = Math.min(100, Math.round((top.score ?? 0) + extra))
  const level = levelOf(riskIndex)
  const base = { level, known: true, riskIndex, availableCount: SENSOR_ORDER.length }

  if (active.length === 0) {
    return {
      ...base,
      activeHazards: [],
      headline: 'Environment is safe',
      explanation: 'All four sensors are reporting within normal limits. No action is required.',
    }
  }

  const names = active.map((id) => SENSOR_META[id].name.toLowerCase())
  if (active.length > 1) {
    return {
      ...base,
      activeHazards: active,
      headline: `${active.length} active hazards`,
      explanation: `${top.reason}, with ${names.slice(1).join(' and ')} also out of range. ${
        level === 'critical' ? 'Immediate response is recommended.' : 'Monitor closely.'
      }`,
    }
  }
  return {
    ...base,
    activeHazards: active,
    headline: level === 'critical' ? `${SENSOR_META[top.id].name} hazard` : `${SENSOR_META[top.id].name} warning`,
    explanation: `${top.reason}. ${level === 'critical' ? 'Immediate response is recommended.' : 'Monitor this reading closely.'}`,
  }
}
