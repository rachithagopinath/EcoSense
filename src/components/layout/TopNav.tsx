import { motion } from 'framer-motion'
import { Bell, RotateCcw } from 'lucide-react'
import { useTelemetry } from '../../context/telemetryContext'
import type { RouteId } from '../../hooks/useHashRoute'
import { isActive } from '../../lib/alerts'
import { cn } from '../../lib/cn'
import { Logo } from './Logo'
import { NAV_ITEMS } from './nav'

/** Logo · dark pill navigation · simulation status and controls. */
export function TopNav({ route, onNavigate }: { route: RouteId; onNavigate: (r: RouteId) => void }) {
  const { alerts, reset } = useTelemetry()
  const active = alerts.filter(isActive).length

  return (
    <header className="flex flex-wrap items-center gap-3 md:flex-nowrap">
      <div className="flex flex-1 items-center gap-2 md:flex-none md:basis-[190px]">
        <Logo />
        <span className="text-[15px] font-medium tracking-[-0.01em]">EcoSense</span>
      </div>

      {/* Right cluster (before the nav on mobile so the nav can wrap below) */}
      <div className="flex items-center gap-2 md:order-3 md:basis-[190px] md:justify-end">
        <span
          className="hidden h-8 items-center gap-1.5 rounded-full border border-line bg-paper px-3 text-[12px] text-ink-2 sm:inline-flex"
          title="All readings are simulated. The ESP32 is not connected yet."
        >
          <span className="size-1.5 rounded-full bg-warn" aria-hidden />
          Simulated
        </span>
        <button
          type="button"
          onClick={() => onNavigate('alerts')}
          className="relative grid size-8 place-items-center rounded-full border border-line bg-paper text-ink-2 transition-colors hover:text-ink"
          aria-label={active ? `${active} alerts need attention` : 'Alerts'}
        >
          <Bell className="size-3.5" strokeWidth={1.8} />
          {active > 0 && (
            <span className="tnum absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9.5px] font-semibold text-white">
              {active}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={reset}
          className="grid size-8 place-items-center rounded-full border border-line bg-paper text-ink-2 transition-colors hover:text-ink"
          aria-label="Reset to normal conditions"
          title="Reset to normal conditions"
        >
          <RotateCcw className="size-3.5" strokeWidth={1.8} />
        </button>
      </div>

      <nav aria-label="Primary" className="order-last w-full md:order-2 md:flex md:w-auto md:flex-1 md:justify-center">
        <ul className="flex w-full items-center gap-0.5 overflow-x-auto rounded-full bg-night p-1 md:w-auto">
          {NAV_ITEMS.map((item) => {
            const isCurrent = item.id === route
            const count = item.id === 'alerts' ? active : 0
            return (
              <li key={item.id} className="flex-1 md:flex-none">
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={cn(
                    'relative flex h-7 w-full items-center justify-center gap-1.5 rounded-full px-3.5 text-[12.5px] whitespace-nowrap transition-colors',
                    isCurrent ? 'text-ink' : 'text-white/75 hover:text-white',
                  )}
                >
                  {isCurrent && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-paper"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                  <span className="relative">{item.label}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        'tnum relative grid h-4 min-w-4 place-items-center rounded-[5px] px-1 text-[10px]',
                        isCurrent ? 'bg-ink text-white' : 'bg-white/12 text-white',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}
