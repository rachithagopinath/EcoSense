import { useMemo } from 'react'

/** Minimal SVG sparkline — a single thin line, no fill. */
export function Sparkline({
  values,
  color = 'var(--color-ink)',
  height = 28,
  minSpan = 0,
  ariaLabel,
}: {
  values: number[]
  color?: string
  height?: number
  minSpan?: number
  ariaLabel: string
}) {
  const d = useMemo(() => {
    if (values.length < 2) return ''
    let min = Math.min(...values)
    let max = Math.max(...values)
    const span = Math.max(minSpan, 1e-6)
    if (max - min < span) {
      const mid = (max + min) / 2
      min = mid - span / 2
      max = mid + span / 2
    }
    const pad = (max - min) * 0.1
    min -= pad
    max += pad
    return values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * 100
        const y = height - ((v - min) / (max - min)) * height
        return `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`
      })
      .join(' ')
  }, [values, height, minSpan])

  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="block w-full" style={{ height }} role="img" aria-label={ariaLabel}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
