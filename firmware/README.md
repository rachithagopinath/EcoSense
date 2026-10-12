# EcoSense firmware (ESP32-WROOM)

`EcoSense_ESP32/EcoSense_ESP32.ino` is the sketch running on the prototype. It reads the sensors, drives the
SH1106 OLED (U8g2), the red/green LEDs and the passive buzzer, and sends the readings to the dashboard over USB.

| Part | Pin |
|---|---|
| DHT11 data | GPIO 18 |
| Raindrop sensor AO | GPIO 34 (wet at ≤ 2500) |
| KY-026 flame sensor D0 | GPIO 27 |
| Passive buzzer | GPIO 25 |
| Red LED / Green LED | GPIO 26 / GPIO 33 |
| OLED SDA / SCL | GPIO 21 / GPIO 22 |

Libraries: **U8g2** and **DHT sensor library** (Adafruit, plus *Adafruit Unified Sensor*).
Board: **ESP32 Dev Module**, ESP32 Arduino core **3.x** (the sketch uses `ledcAttach`).

## Serial output read by the dashboard

About once per second the sketch prints **one JSON object per line** at **115200 baud**:

```json
{"temperature":28.4,"humidity":61.0,"rainRaw":3990,"rainDetected":false,"flameRaw":0,"flameDetected":false,"uptimeMs":2000}
```

| Field | Meaning |
|---|---|
| `temperature`, `humidity` | DHT11 reading (°C, %RH); `null` if there has been no valid reading for 10 s |
| `rainRaw` | Raindrop sensor AO (0–4095, lower = wetter) |
| `rainDetected` | `rainRaw <= 2500` |
| `flameRaw` | `digitalRead(27)` of the KY-026 D0 pin |
| `flameDetected` | `flameRaw == FLAME_ACTIVE` |
| `uptimeMs` | `millis()` |

Lines that don't start with `{` (such as the start-up banner) are ignored by the dashboard.
Set `PRINT_TEXT_DIAGNOSTICS` to `true` to also print the old human-readable line for debugging.

## Flame sensor polarity

`#define FLAME_ACTIVE HIGH` means D0 reads `1` when a flame is detected. To check it, open the Serial Monitor
at 115200, hold a lighter 10–20 cm from the sensor and confirm that `flameDetected` is `true` only while the
flame is there. If it is reversed, change the define to `LOW`.

## Before connecting the website

Close the Arduino Serial Monitor. Only one program can use the USB port at a time.
