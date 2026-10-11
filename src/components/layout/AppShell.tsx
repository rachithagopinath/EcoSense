import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { RouteId } from '../../hooks/useHashRoute'
import { TopNav } from './TopNav'

/** Light page with one large rounded workspace frame, as in the reference. */
export function AppShell({ route, onNavigate, children }: { route: RouteId; onNavigate: (r: RouteId) => void; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-page p-2 sm:p-3 lg:p-4 2xl:p-5 short:p-2">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-paper focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <div className="flex w-full flex-1 flex-col rounded-[22px] border border-white bg-frame px-4 py-4 shadow-frame sm:rounded-[28px] sm:px-6 sm:py-5 lg:px-7 2xl:px-8 short:py-3">
        <TopNav route={route} onNavigate={onNavigate} />
        <main id="main" tabIndex={-1} className="flex flex-1 flex-col pt-6 sm:pt-7 short:pt-3">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={route}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex flex-1 flex-col"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
