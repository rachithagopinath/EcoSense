import { RAIN_WET_THRESHOLD } from '../config/hardware'
import type { LiveRecord } from '../types/telemetry'

/**
 * EcoSense serial protocol: one JSON object per line, e.g.
 *
 *   {"temperature":28.5,"humidity":62.0,"rainRaw":3980,"rainDetected":false,"flameRaw":1,"flameDetected":false,"uptimeMs":51234}
 *
 * - Any line that does not start with "{" is ignored (boot messages, debug prints).
 * - A failed sensor read must be sent as null, never as a made-up number.
 * - flameDetected must come from the device, because only the sketch knows the
 *   verified polarity of the KY-026 D0 pin.
 */

export type ParseResult = { ok: true; record: LiveRecord } | { ok: false; reason: string }

const KNOWN_FIELDS = ['temperature', 'humidity', 'rainRaw', 'rainDetected', 'flameRaw', 'flameDetected'] as const

function num(v: unknown, min: number, max: number): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  if (v < min || v > max) return null
  return v
}

function bool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v
  // Accept 0/1 as well, since some sketches print booleans as integers.
  if (v === 0 || v === 1) return v === 1
  return null
}

export function parseLine(line: string): ParseResult {
  const text = line.trim()
  if (!text) return { ok: false, reason: 'empty' }
  if (!text.startsWith('{')) return { ok: false, reason: 'not JSON' }

  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'malformed JSON' }
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return { ok: false, reason: 'not an object' }
  const o = data as Record<string, unknown>
  if (!KNOWN_FIELDS.some((k) => k in o)) return { ok: false, reason: 'no EcoSense fields' }

  // DHT11 range is 0–50 °C / 20–90 %RH; allow some margin, reject anything physically implausible.
  const temperature = num(o.temperature, -40, 85)
  const humidity = num(o.humidity, 0, 100)
  const rainRaw = num(o.rainRaw, 0, 4095)
  const flameRawNum = num(o.flameRaw, 0, 1)

  let rainDetected = bool(o.rainDetected)
  if (rainDetected === null && rainRaw !== null) rainDetected = rainRaw <= RAIN_WET_THRESHOLD

  return {
    ok: true,
    record: {
      temperature: temperature === null ? null : Math.round(temperature * 10) / 10,
      humidity: humidity === null ? null : Math.round(humidity * 10) / 10,
      rainRaw: rainRaw === null ? null : Math.round(rainRaw),
      rainDetected,
      flameRaw: flameRawNum === null ? null : Math.round(flameRawNum),
      flameDetected: bool(o.flameDetected),
      uptimeMs: num(o.uptimeMs ?? o.ms ?? o.t, 0, Number.MAX_SAFE_INTEGER),
    },
  }
}

/**
 * Splits a byte stream into lines, tolerating partial chunks and \r\n endings.
 * Over-long lines (no newline for MAX chars) are dropped.
 */
export class LineSplitter {
  private buffer = ''
  private readonly maxLength: number
  constructor(maxLength: number) {
    this.maxLength = maxLength
  }

  push(chunk: string): { lines: string[]; dropped: number } {
    this.buffer += chunk
    const parts = this.buffer.split('\n')
    this.buffer = parts.pop() ?? ''
    let dropped = 0
    if (this.buffer.length > this.maxLength) {
      this.buffer = ''
      dropped++
    }
    const lines: string[] = []
    for (const p of parts) {
      const l = p.replace(/\r$/, '')
      if (l.length > this.maxLength) dropped++
      else lines.push(l)
    }
    return { lines, dropped }
  }

  reset() {
    this.buffer = ''
  }
}
