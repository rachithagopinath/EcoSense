import { useEffect } from 'react'
import { AppShell } from './components/layout/AppShell'
import { NAV_ITEMS } from './components/layout/nav'
import { TelemetryProvider } from './context/TelemetryProvider'
import { useHashRoute, type RouteId } from './hooks/useHashRoute'
import { AlertsPage } from './pages/AlertsPage'
import { MonitoringPage } from './pages/MonitoringPage'
import { OverviewPage } from './pages/OverviewPage'
import { SystemPage } from './pages/SystemPage'

function Page({ route, navigate }: { route: RouteId; navigate: (r: RouteId) => void }) {
  switch (route) {
    case 'monitoring':
      return <MonitoringPage />
    case 'alerts':
      return <AlertsPage />
    case 'system':
      return <SystemPage />
    default:
      return <OverviewPage onNavigate={navigate} />
  }
}

export default function App() {
  const [route, navigate] = useHashRoute()

  useEffect(() => {
    const label = NAV_ITEMS.find((n) => n.id === route)?.label ?? 'Overview'
    document.title = `${label} · EcoSense`
    window.scrollTo({ top: 0 })
  }, [route])

  return (
    <TelemetryProvider>
      <AppShell route={route} onNavigate={navigate}>
        <Page route={route} navigate={navigate} />
      </AppShell>
    </TelemetryProvider>
  )
}
