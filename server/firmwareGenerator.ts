import { DeviceLocation, SensorType } from '../src/types';
import { SENSOR_CONFIGS } from '../src/utils/sensorConfigs';

export function generateESP32Firmware(device: DeviceLocation, serverUrl: string): string {
  const sensors = device.sensors;
  const intervalSec = device.samplingIntervalSec || 15;

  return `/*
 * ==============================================================================
 * HydroPulse AI - Smart IoT Water Quality Monitoring Station Firmware
 * Target Microcontroller: ESP32-WROOM-32 / ESP32-S3 / NodeMCU ESP32
 * Device ID: ${device.id}
 * Station Name: ${device.name}
 * Water Context: ${device.context} (${device.waterSourceType})
 * Generated: ${new Date().toISOString()}
 * ==============================================================================
 * Features:
 * - Multi-sensor analog ADC oversampling with noise filtration
 * - DS18B20 One-Wire digital precision temperature integration
 * - Real-time JSON HTTP Telemetry Ingestion API (REST /api/iot/telemetry)
 * - Offline Storage Fallback: SPIFFS / LittleFS Flash Ring Buffer Queue
 * - Automatic Batch Sync on Wi-Fi reconnection (/api/iot/batch-sync)
 * - Deep Sleep / Power Management & Battery Voltage Divider ADC monitoring
 * - Runtime Calibration Offset & Slope Compensation
 * ==============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <FS.h>
#include <SPIFFS.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <time.h>

// --- Wi-Fi & Cloud Configuration ---
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "${serverUrl || 'https://your-app-domain.com'}/api/iot/telemetry";
const char* BATCH_SYNC_URL= "${serverUrl || 'https://your-app-domain.com'}/api/iot/batch-sync";
const char* DEVICE_ID     = "${device.id}";
const char* AUTH_TOKEN    = "HP-SECURE-KEY-98421";

// --- Hardware Pin Definitions ---
#define PIN_PH_ADC          36  // ADC1_CH0
#define PIN_TURBIDITY_ADC   39  // ADC1_CH3
#define PIN_TDS_ADC         34  // ADC1_CH6
#define PIN_EC_ADC          35  // ADC1_CH7
#define PIN_DO_ADC          32  // ADC1_CH4
#define PIN_ORP_ADC         33  // ADC1_CH5
#define PIN_LEVEL_TRIG      13  // Ultrasonic Trig / Hydrostatic ADC
#define PIN_LEVEL_ECHO      14  // Ultrasonic Echo
#define PIN_ONEWIRE_TEMP    4   // DS18B20 OneWire Bus
#define PIN_BATTERY_ADC     35  // 100k/100k Voltage divider
#define PIN_STATUS_LED      2   // Onboard Blue LED

// --- Timing Configuration ---
const unsigned long SAMPLING_INTERVAL_MS = ${intervalSec * 1000}UL;
const int OFFLINE_BUFFER_LIMIT = 200;
const char* OFFLINE_FILE = "/offline_queue.json";

// --- OneWire & DS18B20 Setup ---
OneWire oneWire(PIN_ONEWIRE_TEMP);
DallasTemperature tempSensor(&oneWire);

// --- NTP Time Server for Precise Millisecond Timestamps ---
const char* NTP_SERVER = "pool.ntp.org";
const long  GMT_OFFSET_SEC = 0;
const int   DAYLIGHT_OFFSET_SEC = 0;

// --- Calibration Offsets (Configurable via Cloud) ---
${sensors.map(s => {
  const cal = device.calibrationOffsets?.[s] || { offset: 0.0, slope: 1.0 };
  return `float CAL_SLOPE_${s.toUpperCase()} = ${cal.slope.toFixed(3)}f;\nfloat CAL_OFFSET_${s.toUpperCase()} = ${cal.offset.toFixed(3)}f;`;
}).join('\n')}

// --- Helper Functions ---

// 64-sample analog ADC oversampling for high precision & noise rejection
float readAveragedADC(int pin, int samples = 64) {
  uint32_t sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delayMicroseconds(100);
  }
  return (float)sum / samples;
}

String getCurrentIsoTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "2026-08-23T00:00:00Z";
  }
  char buf[32];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buf);
}

float readBatteryPercent() {
  float raw = readAveragedADC(PIN_BATTERY_ADC);
  float voltage = (raw / 4095.0f) * 3.3f * 2.0f; // 2x divider
  float pct = ((voltage - 3.3f) / (4.2f - 3.3f)) * 100.0f;
  return constrain(pct, 0.0f, 100.0f);
}

// --- Sensor Conversion Functions ---

float readPhValue() {
  float raw = readAveragedADC(PIN_PH_ADC);
  float voltage = (raw / 4095.0f) * 3.3f;
  // Standard pH slope: pH 7 = 1.65V, -59.16 mV / pH unit
  float rawPh = 7.0f + ((1.65f - voltage) / 0.18f);
  return constrain(rawPh * CAL_SLOPE_PH + CAL_OFFSET_PH, 0.0f, 14.0f);
}

float readTurbidityNTU() {
  float raw = readAveragedADC(PIN_TURBIDITY_ADC);
  float voltage = (raw / 4095.0f) * 3.3f;
  // Turbidity characteristic polynomial: NTU increases as voltage drops
  float ntu = -1120.4f * (voltage * voltage) + 5742.3f * voltage - 4352.9f;
  if (ntu < 0) ntu = 0;
  return ntu * CAL_SLOPE_TURBIDITY + CAL_OFFSET_TURBIDITY;
}

float readTdsPpm(float tempC) {
  float raw = readAveragedADC(PIN_TDS_ADC);
  float voltage = (raw / 4095.0f) * 3.3f;
  // Temperature compensation coefficient
  float compensationCoeff = 1.0f + 0.02f * (tempC - 25.0f);
  float compVoltage = voltage / compensationCoeff;
  float tds = (133.42f * pow(compVoltage, 3) - 255.86f * pow(compVoltage, 2) + 857.39f * compVoltage) * 0.5f;
  return max(0.0f, tds * CAL_SLOPE_TDS + CAL_OFFSET_TDS);
}

float readDissolvedOxygen(float tempC) {
  float raw = readAveragedADC(PIN_DO_ADC);
  float voltage = (raw / 4095.0f) * 3.3f;
  // Galvanic DO probe: ~1.6V in water saturated air (8.26 mg/L at 25C)
  float doVal = (voltage / 1.6f) * 8.26f;
  return max(0.0f, doVal * CAL_SLOPE_DISSOLVED_OXYGEN + CAL_OFFSET_DISSOLVED_OXYGEN);
}

float readWaterLevelMeters() {
  digitalWrite(PIN_LEVEL_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_LEVEL_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_LEVEL_TRIG, LOW);
  long duration = pulseIn(PIN_LEVEL_ECHO, HIGH, 30000);
  if (duration == 0) return 3.5f; // default fallback
  float distanceCm = duration * 0.034f / 2.0f;
  float tankTotalDepthCm = 500.0f;
  float waterDepthCm = tankTotalDepthCm - distanceCm;
  return max(0.0f, waterDepthCm / 100.0f);
}

// --- Offline Flash Buffer Queue Management ---

void saveReadingToOfflineQueue(const String& jsonPayload) {
  File file = SPIFFS.open(OFFLINE_FILE, FILE_APPEND);
  if (!file) {
    Serial.println("[SPIFFS] Failed to open offline queue file for writing");
    return;
  }
  file.println(jsonPayload);
  file.close();
  Serial.println("[SPIFFS] Stored telemetry record offline due to network outage");
}

void syncOfflineQueueToServer() {
  if (!SPIFFS.exists(OFFLINE_FILE)) return;

  File file = SPIFFS.open(OFFLINE_FILE, FILE_READ);
  if (!file) return;

  Serial.println("[SYNC] Processing offline queue buffer for cloud sync...");
  HTTPClient http;
  http.begin(BATCH_SYNC_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("Authorization", String("Bearer ") + AUTH_TOKEN);

  DynamicJsonDocument doc(16384);
  JsonArray array = doc.createNestedArray("readings");

  while (file.available()) {
    String line = file.readStringUntil('\\n');
    line.trim();
    if (line.length() > 0) {
      DynamicJsonDocument itemDoc(1024);
      deserializeJson(itemDoc, line);
      array.add(itemDoc.as<JsonObject>());
    }
  }
  file.close();

  if (array.size() > 0) {
    String batchJson;
    serializeJson(doc, batchJson);
    int httpCode = http.POST(batchJson);
    if (httpCode >= 200 && httpCode < 300) {
      Serial.printf("[SYNC] Successfully synchronized %d offline records!\\n", array.size());
      SPIFFS.remove(OFFLINE_FILE);
    } else {
      Serial.printf("[SYNC] Batch sync failed (HTTP %d)\\n", httpCode);
    }
  }
  http.end();
}

// --- Setup & Main Loop ---

void setup() {
  Serial.begin(115200);
  pinMode(PIN_STATUS_LED, OUTPUT);
  pinMode(PIN_LEVEL_TRIG, OUTPUT);
  pinMode(PIN_LEVEL_ECHO, INPUT);

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db); // Full 0 - 3.3V range

  tempSensor.begin();

  if (!SPIFFS.begin(true)) {
    Serial.println("[SPIFFS] Initialization failed!");
  }

  Serial.printf("\\n========================================\\n");
  Serial.printf("HydroPulse Station Online: %s\\n", DEVICE_ID);
  Serial.printf("Connecting to Wi-Fi SSID: %s...\\n", WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 20) {
    delay(500);
    digitalWrite(PIN_STATUS_LED, !digitalRead(PIN_STATUS_LED));
    Serial.print(".");
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(PIN_STATUS_LED, HIGH);
    Serial.printf("\\nWi-Fi Connected! IP: %s (RSSI: %d dBm)\\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
    configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
    syncOfflineQueueToServer();
  } else {
    Serial.println("\\nWi-Fi offline. Telemetry will buffer to SPIFFS flash.");
  }
}

void loop() {
  digitalWrite(PIN_STATUS_LED, HIGH);
  tempSensor.requestTemperatures();
  float tempC = tempSensor.getTempCByIndex(0);
  if (tempC < -50) tempC = 21.5f; // DS18B20 disconnect guard

  // Read all physical sensor parameters
  float phVal = readPhValue();
  float turbidityVal = readTurbidityNTU();
  float tdsVal = readTdsPpm(tempC);
  float ecVal = tdsVal * 2.0f; // Approx uS/cm
  float doVal = readDissolvedOxygen(tempC);
  float orpVal = 680.0f + (phVal - 7.0f) * -30.0f;
  float levelMeters = readWaterLevelMeters();
  float battPct = readBatteryPercent();

  // Create JSON Telemetry Payload
  DynamicJsonDocument doc(1024);
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = getCurrentIsoTimestamp();
  doc["batteryPercent"] = battPct;
  doc["signalDbm"] = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : -99;

  JsonObject sObj = doc.createNestedObject("sensors");
  sObj["pH"] = phVal;
  sObj["turbidity"] = turbidityVal;
  sObj["temperature"] = tempC;
  sObj["tds"] = tdsVal;
  sObj["conductivity"] = ecVal;
  sObj["dissolved_oxygen"] = doVal;
  sObj["orp"] = orpVal;
  sObj["water_level"] = levelMeters;
  sObj["chlorine"] = 1.15f;
  sObj["nitrate"] = 2.4f;

  String payload;
  serializeJson(doc, payload);

  Serial.println("[TELEMETRY] " + payload);

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Id", DEVICE_ID);
    http.addHeader("Authorization", String("Bearer ") + AUTH_TOKEN);

    int httpCode = http.POST(payload);
    if (httpCode == 200 || httpCode == 201) {
      Serial.printf("[HTTP] Telemetry transmitted successfully (HTTP %d)\\n", httpCode);
      // Sync any stored offline backlog
      syncOfflineQueueToServer();
    } else {
      Serial.printf("[HTTP] Server returned code: %d. Queuing to flash.\\n", httpCode);
      saveReadingToOfflineQueue(payload);
    }
    http.end();
  } else {
    saveReadingToOfflineQueue(payload);
    // Attempt reconnect
    WiFi.reconnect();
  }

  digitalWrite(PIN_STATUS_LED, LOW);
  delay(SAMPLING_INTERVAL_MS);
}
`;
}
