/**
 * Settings for the physical ESP32 prototype. Keep these in step with the
 * Arduino sketch (see firmware/README.md).
 */

/** Must match Serial.begin(...) in the sketch. */
export const SERIAL_BAUD_RATE = 115200

/** Raindrop sensor (AO on GPIO 34): ≤ this raw value counts as wet. */
export const RAIN_WET_THRESHOLD = 2500
/** Calibration notes from the prototype, shown for context only. */
export const RAIN_DRY_TYPICAL = 4000
export const RAIN_WET_TYPICAL = 1443

/** Mark live data stale when no valid record arrives for this long while the port is open. */
export const STALE_AFTER_MS = 5000

/**
 * Raise an alert on the first reading that detects a condition, but only clear
 * it after this many consecutive normal readings. Stops a flickering sensor from
 * filling the alert history.
 */
export const CLEAR_AFTER_READINGS = 3

/** Live readings kept for the trend chart and radial map (~2 minutes at 1 reading/s). */
export const LIVE_HISTORY_LENGTH = 120

/**
 * Apply the dashboard's existing temperature rule (warning ≥ 38 °C, critical ≥ 45 °C)
 * to the DHT11 reading. The ESP32's buzzer/LEDs do not react to temperature, only
 * the dashboard does. Set to false to show temperature as a reading only.
 */
export const LIVE_TEMPERATURE_ALERTS = true

/** Lines longer than this are discarded as corrupt (one EcoSense record is ~150 chars). */
export const MAX_LINE_LENGTH = 1024
