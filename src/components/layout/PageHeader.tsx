import type { ReactNode } from 'react'
import { useNow } from '../../hooks/useNow'

const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

/** Small context line, restrained heading on the left, controls on the right. */
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  const now = useNow(60_000)
  return (
    <header className="flex flex-col gap-4 pb-5 md:flex-row md:items-end md:justify-between short:pb-3">
      <div>
        <p className="eyebrow">Prototype station PS-01 · {dateFmt.format(now)}</p>
        <h1 className="mt-1.5 text-[26px] leading-tight font-normal tracking-[-0.025em] text-ink sm:text-[30px]">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  )
}
