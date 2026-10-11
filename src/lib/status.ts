import type { AlertSeverity, StatusLevel } from '../types/telemetry'

/**
 * Status → style mapping. Red, amber and green are reserved for risk states.
 * Class strings are written in full so Tailwind can detect them.
 */
export interface LevelStyle {
  label: string
  /** Wording for the overall risk band */
  band: string
  text: string
  dot: string
  soft: string
  color: string
}

export const LEVEL_STYLE: Record<StatusLevel, LevelStyle> = {
  safe: { label: 'Normal', band: 'Low', text: 'text-safe', dot: 'bg-safe', soft: 'bg-safe-soft', color: 'var(--color-safe)' },
  warning: { label: 'Warning', band: 'Elevated', text: 'text-warn', dot: 'bg-warn', soft: 'bg-warn-soft', color: 'var(--color-warn)' },
  critical: { label: 'Critical', band: 'High', text: 'text-crit', dot: 'bg-crit', soft: 'bg-crit-soft', color: 'var(--color-crit)' },
}

export const ALERT_STYLE: Record<AlertSeverity, { label: string; dot: string; text: string }> = {
  critical: { label: 'Critical', dot: 'bg-crit', text: 'text-crit' },
  warning: { label: 'Warning', dot: 'bg-warn', text: 'text-warn' },
  resolved: { label: 'Resolved', dot: 'bg-safe', text: 'text-safe' },
}
