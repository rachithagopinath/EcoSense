import { CloudRain, Flame, Thermometer, Wind, type LucideIcon } from 'lucide-react'
import type { SensorId } from '../types/telemetry'

export const SENSOR_ICON: Record<SensorId, LucideIcon> = {
  fire: Flame,
  flood: CloudRain,
  air: Wind,
  temperature: Thermometer,
}
