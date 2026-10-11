# EcoSense

Dashboard prototype for **Edge-AI Enabled Environmental Intelligent Monitoring Network for Multi-Hazard Early Warning**.

> Simulation mode — the ESP32 is not connected yet. All readings are simulated. Risk is assessed with simple threshold rules; no trained model is running.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts: `npm run build` (typecheck + production build), `npm run preview`, `npm run lint`.
Fonts are bundled, so it works offline after `npm install`.

## Demo

The Overview is an asymmetric layout: a dark risk briefing with a radial map of recent readings,
environmental trends and sensor health beneath it, and a "Needs attention" column on the right
(acknowledge an alert to clear it). The top bar has the navigation, a simulation indicator,
an alerts bell and a reset button.

Use the dark **scenario** button (top right of Overview and Monitoring) to switch between:
Normal conditions · Fire detected · Flood risk · Poor air quality · Multiple hazards.
Readings change over a few seconds; the risk summary, sensor row, trend and alerts all update together.
**Reset** (circular arrow in the top bar, or inside the scenario menu) restores normal conditions and clears the alert log.

## Sensors and rules

| Sensor | Hardware | Warning | Critical |
|---|---|---|---|
| Fire Detection | Flame sensor (IR %) | ≥ 30 % | ≥ 60 % |
| Flood Monitoring | Rain sensor (wetness %) | ≥ 40 % | ≥ 70 % |
| Air Quality | MQ-135 (ppm) | ≥ 800 | ≥ 1200 |
| Temperature | DHT11 (°C) | ≥ 38 | ≥ 45 |

Each reading maps to a 0–100 score (warning = 40, critical = 70). The overall risk index is the highest score plus a small amount for each additional active hazard — see `src/lib/evaluate.ts`.

## Structure

```
src/
  types/telemetry.ts     data contract
  data/                  scenarios, simulator (mockSource.ts), TelemetrySource interface
  lib/                   evaluate.ts (rules), alerts.ts, formatting, status styles
  context/               TelemetryProvider + useTelemetry
  components/            layout (sidebar, header, scenario menu), overview, alerts, ui
  pages/                 Overview, Monitoring, Alerts, System
```

## Connecting the ESP32

Implement `TelemetrySource` (`src/data/telemetrySource.ts`), e.g. a WebSocket client that parses
`{ "flame": 3, "rain": 6, "mq135": 420, "temp": 30.5 }` into a `SensorReading` and calls `buildSnapshot()`.
Then replace `new MockTelemetrySource()` in `src/context/TelemetryProvider.tsx` and hide the scenario controls.
