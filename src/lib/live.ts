import { CLEAR_AFTER_READINGS, LIVE_TEMPERATURE_ALERTS, RAIN_WET_THRESHOLD } from '../config/hardware'
import type { LiveRecord, OverallStatus, SensorId, SensorStatus, StatusLevel } from '../types/telemetry'
import { formatNumber, RULES, SENSOR_META, SENSOR_ORDER } from './evaluate'

/**
 * Live (ESP32) assessment.
 *
 * Only what the hardware actually measures is assessed:
 *  - Fire: KY-026 digital output → flame / no flame (critical when detected)
 *  - Flood: raindrop sensor wet / dry → warning when wet
 *  - Temperature: DHT11 °C against the dashboard's existing temperature rule
 *  - Air quality: MQ-135 is not wired to this ESP32 → always "Not connected"
 *
 * No 0–100 risk index is invented for live data; the panels show the number
 * of active alerts instead.
 */

const RANK: Record<StatusLevel, number> = { safe: 0, warning: 1, critical: 2 }

/** Human-readable thresholds per sensor, used on the Overview and Monitoring pages. */
export const LIVE_RULE_TEXT: Record<SensorId, { alert: string; warning: string | null; critical: string | null }> = {
  fire: { alert: 'Alerts when the flame sensor detects a flame', warning: null, critical: 'Flame detected (D0)' },
  flood: {
    alert: `Alerts when the rain sensor reads ≤ ${formatNumber(RAIN_WET_THRESHOLD, 0)} (wet)`,
    warning: `Wet · raw ≤ ${formatNumber(RAIN_WET_THRESHOLD, 0)}`,
    critical: null,
  },
  air: { alert: 'MQ-135 not connected to this ESP32', warning: null, critical: null },
  temperature: LIVE_TEMPERATURE_ALERTS
    ? {
        alert: `Alerts at ≥ ${RULES.temperature.warning} · critical ≥ ${RULES.temperature.critical} °C`,
        warning: `≥ ${RULES.temperature.warning} °C`,
        critical: `≥ ${RULES.temperature.critical} °C`,
      }
    : { alert: 'Reading only, no alert rule', warning: null, critical: null },
}

function unavailable(id: SensorId, label: string, why: string): SensorStatus {
  const meta = SENSOR_META[id]
  return {
    id,
    available: false,
    level: 'safe',
    score: null,
    label,
    reason: why,
    display: '—',
    unit: meta.unit,
    detail: `${LIVE_DEVICE[id]} · ${why.charAt(0).toLowerCase()}${why.slice(1)}`,
    short: 'n/a',
  }
}

/** Part names of the real hardware (the demo uses generic names). */
export const LIVE_DEVICE: Record<SensorId, string> = {
  fire: 'KY-026 flame sensor',
  flood: 'Raindrop sensor',
  air: 'MQ-135',
  temperature: 'DHT11',
}

/** Raw (un-debounced) level per sensor from one record; null = no valid reading. */
function rawLevels(r: LiveRecord): Record<SensorId, StatusLevel | null> {
  const t = r.temperature
  return {
    fire: r.flameDetected === null ? null : r.flameDetected ? 'critical' : 'safe',
    flood: r.rainDetected === null ? null : r.rainDetected ? 'warning' : 'safe',
    air: null,
    temperature:
      t === null
        ? null
        : !LIVE_TEMPERATURE_ALERTS
          ? 'safe'
          : t >= RULES.temperature.critical
            ? 'critical'
            : t >= RULES.temperature.warning
              ? 'warning'
              : 'safe',
  }
}

/**
 * Turns successive records into sensor statuses, with hysteresis:
 * a worse level applies immediately; a better level only after
 * CLEAR_AFTER_READINGS consecutive readings agree.
 */
export class LiveAssessor {
  private effective: Record<SensorId, StatusLevel> = { fire: 'safe', flood: 'safe', air: 'safe', temperature: 'safe' }
  private better: Record<SensorId, number> = { fire: 0, flood: 0, air: 0, temperature: 0 }

  reset() {
    for (const id of SENSOR_ORDER) {
      this.effective[id] = 'safe'
      this.better[id] = 0
    }
  }

  /** Statuses for the last record without advancing the debounce (used for stale/waiting snapshots). */
  describe(record: LiveRecord | null): Record<SensorId, SensorStatus> {
    return this.build(record)
  }

  /** Advance with a new record and return the resulting statuses. */
  assess(record: LiveRecord): Record<SensorId, SensorStatus> {
    const raw = rawLevels(record)
    for (const id of SENSOR_ORDER) {
      const lvl = raw[id]
      if (lvl === null) {
        // No valid reading: keep the last decision. A missing reading is not proof a hazard cleared.
        this.better[id] = 0
        continue
      }
      if (RANK[lvl] >= RANK[this.effective[id]]) {
        this.effective[id] = lvl
        this.better[id] = 0
      } else if (++this.better[id] >= CLEAR_AFTER_READINGS) {
        this.effective[id] = lvl
        this.better[id] = 0
      }
    }
    return this.build(record)
  }

  private build(r: LiveRecord | null): Record<SensorId, SensorStatus> {
    const out = {} as Record<SensorId, SensorStatus>
    const waiting = (id: SensorId) => unavailable(id, 'Waiting', 'Waiting for the first reading')
    if (!r) {
      for (const id of SENSOR_ORDER) out[id] = id === 'air' ? airStatus() : waiting(id)
      return out
    }
    const clearing = (id: SensorId) =>
      this.better[id] > 0 ? ` · clearing ${this.better[id]}/${CLEAR_AFTER_READINGS}` : ''

    // Fire — KY-026 digital output
    if (r.flameDetected === null) {
      out.fire = unavailable('fire', 'No data', 'No flame state received')
    } else {
      const lvl = this.effective.fire
      const d0 = r.flameRaw === null ? '' : ` · D0 = ${r.flameRaw}`
      out.fire = {
        id: 'fire',
        available: true,
        level: lvl,
        score: null,
        label: lvl === 'safe' ? 'No flame' : 'Flame detected',
        reason: lvl === 'safe' ? `No flame detected${d0 ? ` (D0 = ${r.flameRaw})` : ''}` : `The flame sensor detects a flame${d0 ? ` (D0 = ${r.flameRaw})` : ''}`,
        display: r.flameDetected ? 'Flame' : 'None',
        unit: '',
        detail: `${LIVE_DEVICE.fire}${d0} · ${r.flameDetected ? 'flame' : 'no flame'}${clearing('fire')}`,
        short: lvl === 'safe' ? 'Clear' : 'Flame',
      }
    }

    // Flood — raindrop sensor analogue output
    if (r.rainDetected === null) {
      out.flood = unavailable('flood', 'No data', 'No rain reading received')
    } else {
      const lvl = this.effective.flood
      const raw = r.rainRaw === null ? null : formatNumber(r.rainRaw, 0)
      const rawText = raw ? ` (raw ${raw}, wet at ≤ ${formatNumber(RAIN_WET_THRESHOLD, 0)})` : ''
      out.flood = {
        id: 'flood',
        available: true,
        level: lvl,
        score: null,
        label: lvl === 'safe' ? 'Dry' : 'Rain detected',
        reason: lvl === 'safe' ? `No rain detected${rawText}` : `Rain detected on the rain sensor${rawText}`,
        display: raw ?? (r.rainDetected ? 'Wet' : 'Dry'),
        unit: raw ? 'raw' : '',
        detail: `Rain sensor${raw ? ` · ${raw} raw` : ''} · ${r.rainDetected ? 'wet' : 'dry'}${clearing('flood')}`,
        short: lvl === 'safe' ? 'Dry' : 'Wet',
      }
    }

    out.air = airStatus()

    // Temperature — DHT11
    if (r.temperature === null) {
      out.temperature = unavailable('temperature', 'Read failed', 'Reading failed (sensor returned no value)')
    } else {
      const lvl = this.effective.temperature
      const t = formatNumber(r.temperature, 1)
      const rh = r.humidity === null ? 'humidity n/a' : `${formatNumber(r.humidity, 0)}% RH`
      const rule = RULES.temperature
      out.temperature = {
        id: 'temperature',
        available: true,
        level: lvl,
        score: null,
        label: lvl === 'critical' ? 'Extreme heat' : lvl === 'warning' ? 'Hot' : 'Normal',
        reason:
          lvl === 'safe'
            ? `DHT11 reads ${t} °C, ${rh}`
            : `DHT11 reads ${t} °C (${lvl === 'critical' ? `critical at ≥ ${rule.critical}` : `warning at ≥ ${rule.warning}`} °C)`,
        display: t,
        unit: '°C',
        detail: `DHT11 · ${t} °C · ${rh}${clearing('temperature')}`,
        short: `${t}°`,
      }
    }
    return out
  }
}

function airStatus(): SensorStatus {
  return unavailable('air', 'Not connected', 'Not connected to this prototype')
}

/** Overall live assessment from the available sensors only. */
export function liveOverall(sensors: Record<SensorId, SensorStatus>, hasRecord: boolean): OverallStatus {
  const available = SENSOR_ORDER.filter((id) => sensors[id].available)
  const active = available
    .filter((id) => sensors[id].level !== 'safe')
    .sort((a, b) => RANK[sensors[b].level] - RANK[sensors[a].level] || SENSOR_ORDER.indexOf(a) - SENSOR_ORDER.indexOf(b))
  const level: StatusLevel = active.length ? sensors[active[0]].level : 'safe'
  const base = { level, known: hasRecord, riskIndex: null, activeHazards: active, availableCount: available.length }

  if (!hasRecord) {
    return {
      ...base,
      headline: 'Waiting for live readings',
      explanation: 'Connected to the ESP32. The dashboard updates as soon as the first reading arrives.',
    }
  }

  const names = available.map((id) => SENSOR_META[id].name.toLowerCase())
  const notMonitored = SENSOR_ORDER.filter((id) => !sensors[id].available).map((id) => SENSOR_META[id].name.toLowerCase())
  const caveat = notMonitored.length ? `${capitalise(listJoin(notMonitored))} ${notMonitored.length === 1 ? 'is' : 'are'} not monitored right now.` : undefined

  if (!active.length) {
    return {
      ...base,
      caveat,
      headline: 'No active alerts from live sensors',
      explanation: `${capitalise(listJoin(names))} ${names.length === 1 ? 'reports' : 'report'} normal readings.`,
    }
  }

  const fire = active.includes('fire')
  const flood = active.includes('flood')
  const headline =
    fire && flood
      ? 'Flame and rain detected'
      : fire
        ? 'Flame detected'
        : flood
          ? 'Rain detected'
          : active.length > 1
            ? `${active.length} active alerts`
            : `${SENSOR_META[active[0]].name} ${sensors[active[0]].label.toLowerCase()}`

  // Short phrases here; the raw values are shown in Sensor health and in each alert.
  const phrase: Record<SensorId, string> = {
    fire: 'the flame sensor detects a flame',
    flood: 'the rain sensor is wet',
    air: 'air quality is out of range',
    temperature: sensors.temperature.level === 'critical' ? 'temperature is dangerously high' : 'temperature is above normal',
  }
  const advice =
    level === 'critical' ? (fire && active.length > 1 ? 'Respond to the flame first.' : 'Immediate response is recommended.') : 'Monitor this closely.'
  return { ...base, caveat, advice, headline, explanation: `${capitalise(listJoin(active.map((id) => phrase[id])))}.` }
}

function listJoin(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Values stored in history for sparklines: flame 1/0, rain raw, temperature °C. */
export function liveValues(r: LiveRecord): Record<SensorId, number | null> {
  return {
    fire: r.flameDetected === null ? null : r.flameDetected ? 1 : 0,
    flood: r.rainRaw,
    air: null,
    temperature: r.temperature,
  }
}
