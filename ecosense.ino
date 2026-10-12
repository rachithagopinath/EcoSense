#include <Wire.h>
#include <U8g2lib.h>
#include <DHT.h>

// ---------------- PIN CONFIGURATION ----------------

#define DHT_PIN       18
#define DHT_TYPE      DHT11

#define RAIN_PIN      34
#define FLAME_PIN     27

#define BUZZER_PIN    25
#define RED_LED       26
#define GREEN_LED     33

// ---------------- SENSOR SETTINGS ----------------

#define RAIN_THRESHOLD 2500

// Flame sensor D0 value that means "flame detected".
// Verify with a real flame: watch "flameRaw" in the Serial Monitor
// with and without a flame, and set this to the value seen WITH a flame.
#define FLAME_ACTIVE HIGH


// ---------------- DASHBOARD OUTPUT ----------------

// How often a JSON line is sent to the EcoSense website.
const unsigned long JSON_INTERVAL = 1000;

// If the DHT11 has not given a valid reading for this long,
// send null instead of an old value.
const unsigned long DHT_STALE_AFTER = 10000;

// Set to true to also print the old human-readable line
// (the website ignores it; handy when debugging in the Serial Monitor).
#define PRINT_TEXT_DIAGNOSTICS false

// ---------------- OBJECTS ----------------

DHT dht(DHT_PIN, DHT_TYPE);

U8G2_SH1106_128X64_NONAME_F_HW_I2C oled(
  U8G2_R0,
  U8X8_PIN_NONE
);

// ---------------- VARIABLES ----------------

float temperature = NAN;
float humidity = NAN;

int rainValue = 0;
int flameValue = HIGH;

bool rainDetected = false;
bool flameDetected = false;

unsigned long lastDHTRead = 0;
unsigned long lastDHTSuccess = 0;
const unsigned long DHT_INTERVAL = 2500;

unsigned long lastJsonSent = 0;

// ---------------- BUZZER ----------------

void buzzerOn() {
  ledcWriteTone(BUZZER_PIN, 2000);
}

void buzzerOff() {
  ledcWriteTone(BUZZER_PIN, 0);
}

// ---------------- OLED DISPLAY ----------------

void showDisplay() {
  oled.clearBuffer();
  oled.setFont(u8g2_font_6x12_tf);

  oled.drawStr(0, 10, "EcoSense");
  oled.drawHLine(0, 13, 128);

  char line[32];

  if (isnan(temperature)) {
    oled.drawStr(0, 25, "Temp: Reading...");
  } else {
    snprintf(line, sizeof(line),
             "Temp: %.1f C", temperature);
    oled.drawStr(0, 25, line);
  }

  if (isnan(humidity)) {
    oled.drawStr(0, 36, "Humidity: --");
  } else {
    snprintf(line, sizeof(line),
             "Humidity: %.1f%%", humidity);
    oled.drawStr(0, 36, line);
  }

  snprintf(line, sizeof(line),
           "Rain: %s (%d)",
           rainDetected ? "WET" : "DRY",
           rainValue);
  oled.drawStr(0, 47, line);

  if (flameDetected && rainDetected) {
    oled.drawStr(0, 58, "ALERT: RAIN + FLAME!");
  } else if (flameDetected) {
    oled.drawStr(0, 58, "ALERT: FLAME!");
  } else if (rainDetected) {
    oled.drawStr(0, 58, "ALERT: RAIN!");
  } else {
    oled.drawStr(0, 58, "Status: NORMAL");
  }

  oled.sendBuffer();
}

// ---------------- DASHBOARD JSON ----------------
// One complete JSON object per line, e.g.
// {"temperature":28.5,"humidity":61.0,"rainRaw":3987,"rainDetected":false,"flameRaw":0,"flameDetected":false,"uptimeMs":51234}
// The whole line is built first and printed with a single println,
// so no other Serial output can end up inside it.

void sendDashboardJson() {
  // Report null if the DHT11 has not produced a valid reading recently.
  bool dhtFresh = lastDHTSuccess != 0 &&
                  (millis() - lastDHTSuccess) <= DHT_STALE_AFTER;

  char t[12];
  char h[12];
  if (!dhtFresh || isnan(temperature)) strcpy(t, "null");
  else snprintf(t, sizeof(t), "%.1f", temperature);
  if (!dhtFresh || isnan(humidity)) strcpy(h, "null");
  else snprintf(h, sizeof(h), "%.1f", humidity);

  char json[220];
  snprintf(json, sizeof(json),
           "{\"temperature\":%s,\"humidity\":%s,"
           "\"rainRaw\":%d,\"rainDetected\":%s,"
           "\"flameRaw\":%d,\"flameDetected\":%s,"
           "\"uptimeMs\":%lu}",
           t, h,
           rainValue, rainDetected ? "true" : "false",
           flameValue, flameDetected ? "true" : "false",
           (unsigned long)millis());

  Serial.println(json);
}

// ---------------- SETUP ----------------

void setup() {
  Serial.begin(115200);

  pinMode(RAIN_PIN, INPUT);
  pinMode(FLAME_PIN, INPUT);

  pinMode(RED_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);

  // ESP32 Arduino core 3.x
  ledcAttach(BUZZER_PIN, 2000, 8);
  buzzerOff();

  Wire.begin(21, 22);
  oled.begin();

  dht.begin();

  oled.clearBuffer();
  oled.setFont(u8g2_font_6x12_tf);
  oled.drawStr(25, 25, "EcoSense");
  oled.drawStr(10, 45, "Starting sensors...");
  oled.sendBuffer();

  delay(2000);

  // Text lines are fine: the website ignores anything that is not JSON.
  Serial.println();
  Serial.println("===== EcoSense Started =====");
  Serial.print("Flame D0 value that means flame: ");
  Serial.println(FLAME_ACTIVE == HIGH ? "1 (HIGH)" : "0 (LOW)");
}

// ---------------- MAIN LOOP ----------------

void loop() {
  // Rain sensor
  rainValue = analogRead(RAIN_PIN);
  rainDetected = (rainValue <= RAIN_THRESHOLD);

  // Flame sensor raw digital reading
  flameValue = digitalRead(FLAME_PIN);
  flameDetected = (flameValue == FLAME_ACTIVE);

  // DHT11 readings
  if (millis() - lastDHTRead >= DHT_INTERVAL ||
      lastDHTRead == 0) {

    float newTemperature = dht.readTemperature();
    float newHumidity = dht.readHumidity();

    if (!isnan(newTemperature) && !isnan(newHumidity)) {
      temperature = newTemperature;
      humidity = newHumidity;
      lastDHTSuccess = millis();
    }

    lastDHTRead = millis();
  }

  // Alert if rain OR flame is detected
  bool alertActive = rainDetected || flameDetected;

  // Green = alert; red = normal
  digitalWrite(GREEN_LED, alertActive ? HIGH : LOW);
  digitalWrite(RED_LED, alertActive ? LOW : HIGH);

  // Repeating beep pattern while alert is active
  if (alertActive) {
    buzzerOn();
    delay(200);

    buzzerOff();
    delay(200);
  } else {
    buzzerOff();
  }

  // OLED
  showDisplay();

  // EcoSense website: one JSON line about once per second
  if (millis() - lastJsonSent >= JSON_INTERVAL || lastJsonSent == 0) {
    sendDashboardJson();
    lastJsonSent = millis();
  }

  // Optional old-style diagnostics (ignored by the website)
  if (PRINT_TEXT_DIAGNOSTICS) {
    Serial.print("Rain ADC: ");
    Serial.print(rainValue);
    Serial.print(" | Flame D0: ");
    Serial.print(flameValue);
    Serial.print(" | Flame detected: ");
    Serial.print(flameDetected ? "YES" : "NO");
    Serial.print(" | Temperature: ");
    Serial.print(temperature);
    Serial.print(" C | Humidity: ");
    Serial.print(humidity);
    Serial.print(" % | Alert: ");
    Serial.println(alertActive ? "YES" : "NO");
  }

  delay(300);
}
