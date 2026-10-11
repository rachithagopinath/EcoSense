import type { SensorId, SensorReading } from '../types/telemetry'
import { SENSOR_META, sensorValue } from './evaluate'

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
const shortFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })

export const formatTime = (t: number) => timeFmt.format(t)
export const formatShortTime = (t: number) => shortFmt.format(t)

export function formatRelative(t: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - t) / 1000))
  if (s < 5) return 'Just now'
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

/** Display value for a sensor, e.g. "1,240" or "30.5". */
export function formatReading(id: SensorId, r: SensorReading): string {
  return sensorValue(id, r).toLocaleString(undefined, {
    minimumFractionDigits: SENSOR_META[id].decimals,
    maximumFractionDigits: SENSOR_META[id].decimals,
  })
}
