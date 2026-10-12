# EcoSense

Dashboard prototype for **Edge-AI Enabled Environmental Intelligent Monitoring Network for Multi-Hazard Early Warning**.

Two data modes, always labelled on screen:

- **Demo data**: simulated readings with scenario controls, the default.
- **Live**: real readings from the ESP32 prototype over USB serial (Web Serial). Only data received from the board is shown.

Risk is assessed with simple threshold rules; no trained model is running.

## Open the dashboard

**https://rachithagopinath.github.io/EcoSense/**

The site is built and deployed automatically by GitHub Actions on every push to `main`
(`.github/workflows/deploy.yml`). Open it in **desktop Chrome or Edge** to use live ESP32 mode.

## Run locally (development)

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts: `npm run build` (typecheck + production build), `npm run preview`, `npm run lint`.
Fonts are bundled, so it works offline after `npm install`.

## Live ESP32 mode (USB serial)

Works in **desktop Chrome or Edge** (Web Serial), on `http://localhost` or the HTTPS GitHub Pages site.
Firefox and Safari don't support Web Serial; there the dashboard stays in demo mode.

1. Upload [`firmware/EcoSense_ESP32/EcoSense_ESP32.ino`](firmware/EcoSense_ESP32/EcoSense_ESP32.ino) to the ESP32
   (see [`firmware/README.md`](firmware/README.md)). It prints one JSON line per reading.
2. Plug the ESP32 in by USB. Close the Arduino Serial Monitor.
   On Linux, your user needs access to the serial device once: `sudo usermod -aG uucp $USER` (Arch/EndeavourOS),
   then log out and back in.
3. Open https://rachithagopinath.github.io/EcoSense/, and on the Overview click **Connect ESP32** and pick the board's port (e.g. `CP2102` / `USB Serial` / `ttyUSB0`).
4. The header shows **ESP32 connected · Live readings**. The Overview, Alerts and Monitoring pages now use only
   the board's data; the demo scenario menu is hidden.

What the live dashboard shows:

| Sensor | Source | Alert |
|---|---|---|
| Fire Detection | KY-026 D0 (GPIO 27) → `flameDetected` | Critical while a flame is detected |
| Flood Monitoring | Raindrop AO (GPIO 34) → `rainRaw`, wet at ≤ 2500 | Warning while wet |
| Temperature | DHT11 (GPIO 18) °C + %RH | Warning ≥ 38 °C, critical ≥ 45 °C (`LIVE_TEMPERATURE_ALERTS` in `src/config/hardware.ts`) |
| Air Quality | MQ-135 not wired to this ESP32 | Shown as *Not connected* |

- An alert is raised on the first reading that detects a condition and cleared after 3 consecutive normal
  readings, so a flickering sensor doesn't fill the history. The Alerts tab records first-detected and cleared times.
- No 0–100 index is invented for live data; the big number is the count of active alerts.
- If the cable is unplugged, the port goes silent for more than 5 s, or you click **Disconnect**, the last reading stays on screen
  marked **stale**, and open alerts stay open. Disconnecting is not treated as "all clear". Use **Reconnect** or
  **Use demo data**. The site never falls back to simulated data on its own.
- Settings (baud rate, rain threshold, stale timeout, debounce) live in `src/config/hardware.ts`.

## Demo

The Overview is an asymmetric layout: a dark risk briefing with a radial map of recent readings,
environmental trends and sensor health beneath it, and a "Needs attention" column on the right
(acknowledge an alert to clear it). The top bar has the navigation, a simulation indicator,
an alerts bell and a reset button.

Use the dark **scenario** button (top right of Overview and Monitoring) to switch between:
Normal conditions · Fire detected · Flood risk · Poor air quality · Multiple hazards.
Readings change over a few seconds (demo mode only); the risk summary, sensor row, trend and alerts all update together.
**Reset** (circular arrow in the top bar, or inside the scenario menu) restores normal conditions and clears the alert log.

## Demo sensors and rules

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

Live mode files:

```
src/config/hardware.ts      baud rate, rain threshold, stale timeout, debounce
src/data/serialProtocol.ts  JSON line validation + line splitter
src/data/serialSource.ts    Web Serial port/reader lifecycle, stale + disconnect handling
src/lib/live.ts             live sensor rules (flame, rain, DHT11; MQ-135 not connected)
src/types/web-serial.d.ts   Web Serial type declarations
firmware/                   ESP32 sketch (sensors, OLED, LEDs, buzzer, JSON output)
```
