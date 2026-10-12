import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, LoaderCircle, Play, RefreshCw, Unplug, Usb } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTelemetry } from '../../context/telemetryContext'
import { SAMPLE_INTERVAL_MS } from '../../data/mockSource'
import { SCENARIOS, SCENARIO_ORDER } from '../../data/scenarios'
import { cn } from '../../lib/cn'
import { formatTime } from '../../lib/format'

const lightButton =
  'inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-paper px-3.5 text-[12.5px] font-medium text-ink transition-colors hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-50'
const darkButton =
  'inline-flex h-9 items-center gap-2 rounded-full bg-night pr-3 pl-3.5 text-[12.5px] font-medium text-white transition-colors hover:bg-night-2 disabled:cursor-not-allowed disabled:opacity-60'

/** Data-source status pill + ESP32 connection controls + demo scenario menu. */
export function ScenarioControls() {
  const { scenario, setScenario, reset, mode, live, serialSupported, connectEsp32, disconnectEsp32, switchToDemo } = useTelemetry()
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

  const isDemo = mode === 'demo'
  const connecting = live.status === 'connecting'
  const portOpen = live.status === 'live' || live.status === 'waiting' || live.status === 'stale'
  const lastSeen = live.lastUpdate ? formatTime(live.lastUpdate) : null

  // Status pill content, by state. Simulated data is never described as live.
  const pill = isDemo
    ? {
        dot: 'bg-accent',
        ping: true,
        strong: 'Demo data',
        muted: serialSupported ? `· simulated · ESP32 not connected · every ${SAMPLE_INTERVAL_MS / 1000}s` : '· simulated · live mode needs Chrome or Edge',
      }
    : live.status === 'live'
      ? { dot: 'bg-safe', ping: true, strong: 'ESP32 connected · Live readings', muted: lastSeen ? `· updated ${lastSeen}` : '' }
      : live.status === 'waiting'
        ? { dot: 'bg-accent', ping: true, strong: 'ESP32 connected', muted: '· waiting for data' }
        : live.status === 'connecting'
          ? { dot: 'bg-accent', ping: true, strong: 'Connecting…', muted: '' }
          : { dot: 'bg-warn', ping: false, strong: 'ESP32 disconnected', muted: lastSeen ? `· last reading ${lastSeen} · stale` : '· no readings' }
  if (!isDemo && live.status === 'stale') {
    pill.strong = 'ESP32 connected · no recent data'
  }

  // Messages worth showing under the controls (errors, diagnostics).
  const note =
    live.status === 'error' || live.status === 'unsupported' || (live.status === 'waiting' && live.message && live.validLines === 0)
      ? live.message
      : live.message === 'No port selected.' && isDemo
        ? 'No port selected. Still showing demo data.'
        : null

  return (
    <>
      <span
        className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-paper px-3.5 text-[12.5px] text-ink-2"
        role="status"
        aria-live="polite"
      >
        <span className="relative flex size-2">
          {pill.ping && <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-40', pill.dot)} />}
          <span className={cn('relative size-2 rounded-full', pill.dot)} />
        </span>
        <span className="font-medium text-ink">{pill.strong}</span>
        {pill.muted && <span className="hidden text-ink-3 sm:inline">{pill.muted}</span>}
      </span>

      {isDemo ? (
        <button
          type="button"
          onClick={() => void connectEsp32()}
          disabled={!serialSupported || connecting}
          className={lightButton}
          title={serialSupported ? 'Choose the ESP32 USB port in the browser dialog' : (live.message ?? 'Web Serial is not available')}
        >
          {connecting ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <Usb className="size-3.5" aria-hidden />}
          {connecting ? 'Connecting…' : 'Connect ESP32'}
        </button>
      ) : portOpen ? (
        <button type="button" onClick={() => void disconnectEsp32()} className={lightButton}>
          <Unplug className="size-3.5" aria-hidden />
          Disconnect
        </button>
      ) : (
        <>
          <button type="button" onClick={() => void switchToDemo()} className={lightButton} disabled={connecting}>
            Use demo data
          </button>
          <button type="button" onClick={() => void connectEsp32()} className={darkButton} disabled={connecting || !serialSupported}>
            {connecting ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <RefreshCw className="size-3.5" aria-hidden />}
            {connecting ? 'Connecting…' : 'Reconnect'}
          </button>
        </>
      )}

      {/* Demo scenarios: only in demo mode, so they can never overwrite live hardware readings. */}
      {isDemo && (
        <div ref={rootRef} className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            className={darkButton}
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
      )}

      {note && (
        <p className={cn('basis-full text-[12px] md:text-right', live.status === 'error' ? 'text-crit' : 'text-ink-3')} role="alert">
          {note}
        </p>
      )}
    </>
  )
}
