import { LIVE_HISTORY_LENGTH, MAX_LINE_LENGTH, SERIAL_BAUD_RATE, STALE_AFTER_MS } from '../config/hardware'
import { historyPoint } from '../lib/evaluate'
import { LiveAssessor, liveOverall, liveValues } from '../lib/live'
import type { HistoryPoint, LiveConnection, LiveRecord, LiveStatus, TelemetrySnapshot } from '../types/telemetry'
import { LineSplitter, parseLine } from './serialProtocol'

export interface SerialCallbacks {
  onSnapshot: (snapshot: TelemetrySnapshot) => void
  onConnection: (connection: LiveConnection) => void
}

/** Web Serial is only available in secure contexts (https or localhost) of desktop Chromium browsers. */
export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.serial && typeof window !== 'undefined' && window.isSecureContext
}

const initialConnection = (): LiveConnection => ({
  status: isWebSerialSupported() ? 'idle' : 'unsupported',
  message: isWebSerialSupported() ? null : unsupportedMessage(),
  lastUpdate: null,
  validLines: 0,
  ignoredLines: 0,
})

function unsupportedMessage(): string {
  if (typeof window !== 'undefined' && !window.isSecureContext) return 'Live mode needs https or localhost.'
  return 'This browser cannot open USB serial ports. Use desktop Chrome or Edge.'
}

/**
 * Live ESP32 source over USB serial (Web Serial API).
 *
 * - The port picker is only shown from connect(), which must be called from a click.
 * - One port at a time; a second connect() while open is ignored.
 * - Disconnection never clears alerts: the last reading is kept and marked stale.
 */
export class SerialTelemetrySource {
  private callbacks: SerialCallbacks | null = null
  private port: SerialPort | null = null
  /** Port granted earlier this session, reused by Reconnect without the picker. */
  private lastPort: SerialPort | null = null
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private loop: Promise<void> | null = null
  private closing = false
  private staleTimer: ReturnType<typeof setInterval> | null = null

  private splitter = new LineSplitter(MAX_LINE_LENGTH)
  private assessor = new LiveAssessor()
  private record: LiveRecord | null = null
  private recordTime = 0
  private history: HistoryPoint[] = []
  private connection: LiveConnection = initialConnection()

  setCallbacks(cb: SerialCallbacks | null) {
    this.callbacks = cb
  }

  get isOpen() {
    return this.port !== null
  }

  getConnection() {
    return this.connection
  }

  /** Ask for a port (picker) or reuse the one granted earlier, then start reading. Returns true when the port opened. */
  async connect(): Promise<boolean> {
    if (!isWebSerialSupported() || !navigator.serial) {
      this.setConnection({ status: 'unsupported', message: unsupportedMessage() })
      return false
    }
    if (this.port || this.connection.status === 'connecting') return this.port !== null

    const previous = this.connection.status
    this.setConnection({ status: 'connecting', message: 'Choose the ESP32 port in the browser dialog…' })

    let port: SerialPort | undefined
    try {
      const granted = await navigator.serial.getPorts()
      port = this.lastPort && granted.includes(this.lastPort) ? this.lastPort : undefined
      if (!port) port = await navigator.serial.requestPort()
    } catch (e) {
      // NotFoundError = the user closed the picker without choosing a port.
      const cancelled = e instanceof DOMException && e.name === 'NotFoundError'
      this.setConnection({
        status: previous,
        message: cancelled ? 'No port selected.' : `Could not access serial ports: ${errorText(e)}`,
      })
      return false
    }

    try {
      await port.open({ baudRate: SERIAL_BAUD_RATE })
    } catch (e) {
      this.setConnection({
        status: 'error',
        message: `Could not open the port (${errorText(e)}). Close the Arduino Serial Monitor or any other app using it, then try again.`,
      })
      return false
    }

    this.port = port
    this.lastPort = port
    this.closing = false
    this.splitter.reset()
    port.addEventListener('disconnect', this.onPortLost)
    this.connection = { ...this.connection, validLines: 0, ignoredLines: 0 }
    this.setConnection({ status: 'waiting', message: 'Port open. Waiting for the first reading…' })
    this.emitSnapshot()
    this.startStaleTimer()
    this.loop = this.readLoop()
    return true
  }

  /** Close the port on request. Keeps the last values (shown as stale) and all alerts. */
  async disconnect(message = 'Disconnected. Showing the last reading received.'): Promise<void> {
    if (!this.port) return
    this.closing = true
    try {
      await this.reader?.cancel()
    } catch {
      /* reader already released */
    }
    await this.loop?.catch(() => {})
    await this.closePort()
    this.closing = false
    this.setConnection({ status: 'disconnected', message })
    this.emitSnapshot()
  }

  /** Forget everything received this session (used when leaving live mode for good). */
  clearSession() {
    this.assessor.reset()
    this.record = null
    this.recordTime = 0
    this.history = []
    this.connection = initialConnection()
  }

  private onPortLost = () => {
    // Fired when the USB cable is unplugged. The read loop also ends; handleLost runs once.
    if (!this.closing) void this.handleLost()
  }

  private async handleLost() {
    if (!this.port || this.closing) return
    this.closing = true
    try {
      await this.reader?.cancel()
    } catch {
      /* ignore */
    }
    await this.closePort()
    this.closing = false
    this.setConnection({
      status: 'disconnected',
      message: 'Connection to the ESP32 was lost (USB unplugged or board reset). Showing the last reading received.',
    })
    this.emitSnapshot()
  }

  private async closePort() {
    this.stopStaleTimer()
    const port = this.port
    this.port = null
    this.reader = null
    if (!port) return
    port.removeEventListener('disconnect', this.onPortLost)
    try {
      await port.close()
    } catch {
      /* already closed or device gone */
    }
  }

  private async readLoop(): Promise<void> {
    const decoder = new TextDecoder()
    // After a non-fatal error (e.g. buffer overrun) the spec gives the port a fresh readable stream.
    while (this.port?.readable && !this.closing) {
      const reader = this.port.readable.getReader()
      this.reader = reader
      try {
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          if (value) this.handleText(decoder.decode(value, { stream: true }))
        }
      } catch {
        if (!this.closing) this.bumpIgnored(1)
      } finally {
        try {
          reader.releaseLock()
        } catch {
          /* ignore */
        }
        if (this.reader === reader) this.reader = null
      }
    }
    if (!this.closing) void this.handleLost()
  }

  private handleText(chunk: string) {
    const { lines, dropped } = this.splitter.push(chunk)
    let ignored = dropped
    for (const line of lines) {
      if (!line.trim()) continue
      const result = parseLine(line)
      if (!result.ok) {
        ignored++
        continue
      }
      this.applyRecord(result.record)
    }
    if (ignored) this.bumpIgnored(ignored)
  }

  private applyRecord(record: LiveRecord) {
    const now = Date.now()
    const sensors = this.assessor.assess(record)
    const overall = liveOverall(sensors, true)
    this.record = record
    this.recordTime = now
    this.history = [...this.history.slice(-(LIVE_HISTORY_LENGTH - 1)), historyPoint(now, sensors, overall, liveValues(record))]
    this.connection = { ...this.connection, validLines: this.connection.validLines + 1 }
    this.setConnection({ status: 'live', message: null, lastUpdate: now })
    this.callbacks?.onSnapshot({ mode: 'live', timestamp: now, stale: false, sensors, overall, history: this.history, live: record })
  }

  /** Snapshot of the current state without a new reading (waiting / stale / disconnected). */
  private emitSnapshot() {
    const sensors = this.assessor.describe(this.record)
    const stale = this.record !== null && this.connection.status !== 'live'
    this.callbacks?.onSnapshot({
      mode: 'live',
      timestamp: this.record ? this.recordTime : Date.now(),
      stale,
      sensors,
      overall: liveOverall(sensors, this.record !== null),
      history: this.history,
      live: this.record,
    })
  }

  private startStaleTimer() {
    this.stopStaleTimer()
    const opened = Date.now()
    this.staleTimer = setInterval(() => {
      const { status, lastUpdate, validLines, ignoredLines } = this.connection
      if (status === 'live' && lastUpdate && Date.now() - lastUpdate > STALE_AFTER_MS) {
        this.setConnection({ status: 'stale', message: `No reading for over ${STALE_AFTER_MS / 1000} s. Showing the last reading received.` })
        this.emitSnapshot()
      } else if (status === 'waiting' && validLines === 0 && Date.now() - opened > STALE_AFTER_MS) {
        this.setConnection({
          status: 'waiting',
          message:
            ignoredLines > 0
              ? 'Receiving data, but not in the EcoSense JSON format. Upload the updated sketch.'
              : `No data yet. Check that the sketch is running at ${SERIAL_BAUD_RATE} baud.`,
        })
      }
    }, 1000)
  }

  private stopStaleTimer() {
    if (this.staleTimer) clearInterval(this.staleTimer)
    this.staleTimer = null
  }

  private bumpIgnored(n: number) {
    this.connection = { ...this.connection, ignoredLines: this.connection.ignoredLines + n }
    this.callbacks?.onConnection(this.connection)
  }

  private setConnection(patch: Partial<LiveConnection> & { status: LiveStatus }) {
    this.connection = { ...this.connection, ...patch }
    this.callbacks?.onConnection(this.connection)
  }
}

function errorText(e: unknown): string {
  if (e instanceof Error) return e.message || e.name
  return String(e)
}
