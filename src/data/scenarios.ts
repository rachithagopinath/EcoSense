import type { Scenario, ScenarioId } from '../types/telemetry'

/**
 * Demo scenarios. The simulator moves smoothly from the current readings to
 * these targets, so a scenario builds up over a few seconds.
 * All values are SIMULATED.
 */
export const SCENARIOS: Record<ScenarioId, Scenario> = {
  normal: {
    id: 'normal',
    label: 'Normal conditions',
    description: 'All readings within safe limits',
    targets: { flameIntensity: 3, rainLevel: 6, airPpm: 420, temperature: 30.5 },
  },
  fire: {
    id: 'fire',
    label: 'Fire detected',
    description: 'Flame sensor detects a fire nearby',
    targets: { flameIntensity: 88, rainLevel: 4, airPpm: 640, temperature: 37 },
  },
  flood: {
    id: 'flood',
    label: 'Flood risk',
    description: 'Heavy, continuous rainfall',
    targets: { flameIntensity: 2, rainLevel: 86, airPpm: 410, temperature: 26 },
  },
  air: {
    id: 'air',
    label: 'Poor air quality',
    description: 'Gas concentration rises sharply',
    targets: { flameIntensity: 3, rainLevel: 5, airPpm: 1450, temperature: 31 },
  },
  multi: {
    id: 'multi',
    label: 'Multiple hazards',
    description: 'Fire with smoke and extreme heat',
    targets: { flameIntensity: 82, rainLevel: 3, airPpm: 1320, temperature: 46 },
  },
}

export const SCENARIO_ORDER: ScenarioId[] = ['normal', 'fire', 'flood', 'air', 'multi']
