import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { LEVEL_STYLE } from '../../lib/status'
import type { StatusLevel } from '../../types/telemetry'

/** White panel with a hairline border. */
export function Surface({
  children,
  className,
  as: Tag = 'section',
  ...rest
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'article'
  'aria-labelledby'?: string
  'aria-label'?: string
}) {
  return (
    <Tag className={cn('rounded-[18px] border border-line bg-paper shadow-panel', className)} {...rest}>
      {children}
    </Tag>
  )
}

/** Panel heading: regular-weight title with a quiet subtitle. */
export function SectionHeader({ id, title, meta, action }: { id?: string; title: string; meta?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 short:pt-4 short:pb-2">
      <div className="min-w-0">
        <h2 id={id} className="text-[16px] font-normal tracking-[-0.015em] text-ink">
          {title}
        </h2>
        {meta && <p className="mt-0.5 text-[12px] text-ink-3">{meta}</p>}
      </div>
      {action}
    </div>
  )
}

/** Status shown as a coloured dot plus a word, never colour alone. */
export function StatusText({ level, label, className }: { level: StatusLevel; label?: string; className?: string }) {
  const s = LEVEL_STYLE[level]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[12px] text-ink-2', className)}>
      <span className={cn('size-1.5 rounded-full', s.dot)} aria-hidden />
      {label ?? s.label}
    </span>
  )
}

/** Small uppercase status pill (like the reference's day badges). */
export function StatusPill({ level, label }: { level: StatusLevel; label?: string }) {
  const s = LEVEL_STYLE[level]
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full border px-2 text-[9.5px] font-semibold tracking-[0.08em] uppercase',
        level === 'safe' ? 'border-line bg-paper text-ink-3' : cn('border-transparent', s.soft, s.text),
      )}
    >
      {label ?? s.label}
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-[18px] bg-line/70', className)} aria-hidden />
}
