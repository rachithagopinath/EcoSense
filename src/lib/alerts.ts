import type { Alert, DataMode, SensorId, SensorStatus, StatusLevel } from '../types/telemetry'
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
 * - a sensor with no valid reading changes nothing (unknown is not "cleared")
 */
export function detectAlerts(
  sensors: Record<SensorId, SensorStatus>,
  latch: AlertLatch,
  timestamp: number,
  mode: DataMode = 'demo',
): { alerts: Alert[]; latch: AlertLatch } {
  const next = { ...latch }
  const alerts: Alert[] = []
  for (const id of SENSOR_ORDER) {
    const s = sensors[id]
    if (!s.available) continue
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
        message: mode === 'live' ? `${s.reason}.` : 'Reading has returned to the safe range.',
        acknowledged: true,
        cleared: true,
        clearedAt: timestamp,
      })
    }
  }
  return { alerts, latch: next }
}

/**
 * Merge newly raised alerts into the log. A newer alert (or recovery) for a
 * sensor clears that sensor's older open alerts and stamps when they cleared.
 */
export function mergeAlerts(prev: Alert[], fresh: Alert[], max: number): Alert[] {
  if (!fresh.length) return prev
  const touched = new Map(fresh.map((a) => [a.sensor, a]))
  const updated = prev.map((a) => {
    const by = touched.get(a.sensor)
    if (!by || a.cleared) return a
    return { ...a, cleared: true, clearedAt: by.severity === 'resolved' ? by.timestamp : a.clearedAt }
  })
  return [...[...fresh].reverse(), ...updated].slice(0, max)
}
