import { Activity, Bell, Cpu, LayoutGrid, type LucideIcon } from 'lucide-react'
import type { RouteId } from '../../hooks/useHashRoute'

export interface NavItem {
  id: RouteId
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'monitoring', label: 'Monitoring', icon: Activity },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'system', label: 'System', icon: Cpu },
]
