import type { Alert, SensorId, SensorStatus, StatusLevel } from '../types/telemetry'
import { SENSOR_META, SENSOR_ORDER } from './evaluate'

const RANK: Record<StatusLevel, number> = { safe: 0, warning: 1, critical: 2 }

let seq = 0
const newIds = () => {
  seq += 1
  return { id: `al-${Date.now().toString(36)}-${seq}`, ref: `AL-${String(seq).padStart(3, '0')}` }
}

/** An alert still needs attention if nobody acknowledged it and it is not cleared. */
export const isActive = (a: Alert) => a.severity !== 'resolved' && !a.acknowledged && !a.cleared

/** Highest level already alerted for each sensor, so one event raises one alert. */
export type AlertLatch = Record<SensorId, StatusLevel>

export const initialLatch = (): AlertLatch => ({ fire: 'safe', flood: 'safe', air: 'safe', temperature: 'safe' })

/**
 * Compare fresh sensor statuses with what has already been alerted:
 * - a sensor getting worse raises a warning / critical alert
 * - a sensor returning to safe raises a "resolved" entry
 */
export function detectAlerts(
  sensors: Record<SensorId, SensorStatus>,
  latch: AlertLatch,
  timestamp: number,
): { alerts: Alert[]; latch: AlertLatch } {
  const next = { ...latch }
  const alerts: Alert[] = []
  for (const id of SENSOR_ORDER) {
    const s = sensors[id]
    const name = SENSOR_META[id].name
    if (RANK[s.level] > RANK[latch[id]]) {
      next[id] = s.level
      alerts.push({
        ...newIds(),
        timestamp,
        sensor: id,
        severity: s.level as 'warning' | 'critical',
        title: `${name} · ${s.label}`,
        message: `${s.reason}.`,
        acknowledged: false,
        cleared: false,
      })
    } else if (s.level === 'safe' && latch[id] !== 'safe') {
      next[id] = 'safe'
      alerts.push({
        ...newIds(),
        timestamp,
        sensor: id,
        severity: 'resolved',
        title: `${name} · Back to normal`,
        message: 'Reading has returned to the safe range.',
        acknowledged: true,
        cleared: true,
      })
    }
  }
  return { alerts, latch: next }
}
