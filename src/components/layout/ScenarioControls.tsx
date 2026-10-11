import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Play } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTelemetry } from '../../context/telemetryContext'
import { SAMPLE_INTERVAL_MS } from '../../data/mockSource'
import { SCENARIOS, SCENARIO_ORDER } from '../../data/scenarios'
import { cn } from '../../lib/cn'

/** Simulation status pill + dark "scenario" button with a menu (mirrors the reference's header actions). */
export function ScenarioControls() {
  const { scenario, setScenario, reset } = useTelemetry()
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <span className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-paper px-3.5 text-[12.5px] text-ink-2">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-40" />
          <span className="relative size-2 rounded-full bg-accent" />
        </span>
        <span className="font-medium text-ink">4 sensors simulated</span>
        <span className="hidden text-ink-3 sm:inline">· ESP32 not connected · every {SAMPLE_INTERVAL_MS / 1000}s</span>
      </span>

      <div ref={rootRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-night pr-3 pl-3.5 text-[12.5px] font-medium text-white transition-colors hover:bg-night-2"
        >
          <Play className="size-3 fill-current" aria-hidden />
          <span>{SCENARIOS[scenario].label}</span>
          <ChevronDown className={cn('size-3.5 text-white/60 transition-transform', open && 'rotate-180')} aria-hidden />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              id={menuId}
              role="menu"
              aria-label="Demo scenarios"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              className="absolute left-0 z-40 mt-2 w-72 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-line bg-paper p-1.5 shadow-[0_16px_40px_-12px_rgb(13_16_20/0.25)] md:right-0 md:left-auto"
            >
              <p className="eyebrow px-3 pt-2 pb-1.5">Demo scenarios</p>
              {SCENARIO_ORDER.map((id) => {
                const s = SCENARIOS[id]
                const active = id === scenario
                return (
                  <button
                    key={id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => {
                      setScenario(id)
                      setOpen(false)
                    }}
                    className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left hover:bg-mist"
                  >
                    <span className="mt-0.5 grid size-4 shrink-0 place-items-center">
                      {active && <Check className="size-4 text-accent" aria-hidden />}
                    </span>
                    <span>
                      <span className="block text-[13px] font-medium text-ink">{s.label}</span>
                      <span className="block text-[12px] text-ink-3">{s.description}</span>
                    </span>
                  </button>
                )
              })}
              <div className="mt-1.5 flex items-center justify-between border-t border-line px-3 pt-2.5 pb-1.5">
                <span className="text-[11.5px] text-ink-3">Readings change over a few seconds</span>
                <button
                  type="button"
                  onClick={() => {
                    reset()
                    setOpen(false)
                  }}
                  className="text-[12px] font-medium text-accent hover:underline"
                >
                  Reset
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
