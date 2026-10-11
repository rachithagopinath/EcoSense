import type { TelemetrySnapshot } from '../types/telemetry'

/**
 * Where telemetry comes from.
 *
 * Today the app uses `MockTelemetrySource` (./mockSource.ts). To connect the
 * ESP32, implement this interface — for example with a WebSocket to the board —
 * parse each JSON frame into a `SensorReading`, keep a short history, and build
 * snapshots with `buildSnapshot()` from ./mockSource.ts. Then swap the source
 * created in `src/context/TelemetryProvider.tsx`.
 *
 * Example frame the ESP32 could send:
 *   { "flame": 3, "rain": 6, "mq135": 420, "temp": 30.5 }
 */
export type TelemetryListener = (snapshot: TelemetrySnapshot) => void

export interface TelemetrySource {
  /** 'simulated' sources must be labelled as such in the UI. */
  readonly kind: 'simulated' | 'live'
  connect(): void
  disconnect(): void
  subscribe(listener: TelemetryListener): () => void
}
