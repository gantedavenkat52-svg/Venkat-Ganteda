import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { iotSimulator } from './server/iotSimulator';
import { analyzeWaterQualityWithAI, chatWithWaterAssistant } from './server/aiService';
import { AnomalyDetectionEngine } from './server/anomalyDetector';
import { generateESP32Firmware } from './server/firmwareGenerator';
import { SENSOR_CONFIGS } from './src/utils/sensorConfigs';
import { SensorType } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Start background IoT device simulator
iotSimulator.start();

// ==========================================
// API ROUTES
// ==========================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'HydroPulse AI Core',
    timestamp: new Date().toISOString(),
    aiEngineReady: Boolean(process.env.GEMINI_API_KEY)
  });
});

// Device Management
app.get('/api/devices', (req, res) => {
  const devices = db.getDevices();
  res.json({ success: true, devices });
});

app.get('/api/devices/:id', (req, res) => {
  const device = db.getDeviceById(req.params.id);
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }
  res.json({ success: true, device });
});

app.post('/api/devices', (req, res) => {
  const { name, locationName, waterSourceType, context, latitude, longitude, sensors, samplingIntervalSec } = req.body;
  if (!name || !locationName) {
    return res.status(400).json({ error: 'Name and location are required' });
  }

  const id = `ESP32-WQM-${String(db.getDevices().length + 1).padStart(3, '0')}`;
  const newDevice = db.addDevice({
    id,
    name,
    locationName,
    waterSourceType: waterSourceType || 'Water Tank',
    context: context || 'drinking',
    latitude: Number(latitude) || 37.7749,
    longitude: Number(longitude) || -122.4194,
    status: 'online',
    batteryPercent: 100,
    signalStrengthDbm: -60,
    firmwareVersion: 'v2.4.1-ota',
    samplingIntervalSec: Number(samplingIntervalSec) || 15,
    lastSeen: new Date().toISOString(),
    sensors: sensors || ['pH', 'turbidity', 'temperature', 'tds', 'dissolved_oxygen'],
    offlineQueueCount: 0,
    isSimulated: true,
    calibrationOffsets: {}
  });

  res.status(201).json({ success: true, device: newDevice });
});

app.put('/api/devices/:id', (req, res) => {
  const updated = db.updateDevice(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Device not found' });
  }
  res.json({ success: true, device: updated });
});

app.delete('/api/devices/:id', (req, res) => {
  const deleted = db.deleteDevice(req.params.id);
  res.json({ success: deleted });
});

// Telemetry Endpoints
app.get('/api/telemetry/latest', (req, res) => {
  const deviceId = (req.query.deviceId as string) || db.getDevices()[0]?.id;
  if (!deviceId) return res.status(400).json({ error: 'No devices available' });

  const readings = db.getReadings(deviceId, 1);
  const device = db.getDeviceById(deviceId);
  res.json({ success: true, latest: readings[0] || null, device });
});

app.get('/api/telemetry/history', (req, res) => {
  const deviceId = (req.query.deviceId as string) || db.getDevices()[0]?.id;
  const timeframe = (req.query.timeframe as string) || '24h'; // 1h, 24h, 7d, 30d, all

  if (!deviceId) return res.status(400).json({ error: 'Device ID required' });

  const allReadings = db.getReadings(deviceId);
  let filtered = allReadings;

  const now = Date.now();
  if (timeframe === '1h') {
    const cutOff = now - 60 * 60 * 1000;
    filtered = allReadings.filter(r => new Date(r.timestamp).getTime() >= cutOff);
  } else if (timeframe === '24h') {
    const cutOff = now - 24 * 60 * 60 * 1000;
    filtered = allReadings.filter(r => new Date(r.timestamp).getTime() >= cutOff);
  } else if (timeframe === '7d') {
    const cutOff = now - 7 * 24 * 60 * 60 * 1000;
    filtered = allReadings.filter(r => new Date(r.timestamp).getTime() >= cutOff);
  }

  res.json({
    success: true,
    deviceId,
    count: filtered.length,
    readings: filtered
  });
});

// Ingest single reading from IoT hardware (ESP32/ESP8266 HTTP POST)
app.post('/api/iot/telemetry', (req, res) => {
  const { deviceId, timestamp, sensors, batteryPercent, signalDbm } = req.body;
  if (!deviceId || !sensors) {
    return res.status(400).json({ error: 'Missing deviceId or sensors payload' });
  }

  let device = db.getDeviceById(deviceId);
  if (!device) {
    device = db.addDevice({
      id: deviceId,
      name: `IoT Node (${deviceId})`,
      locationName: 'Field Station',
      waterSourceType: 'Unassigned Water Body',
      context: 'drinking',
      latitude: 37.7749,
      longitude: -122.4194,
      status: 'online',
      batteryPercent: batteryPercent || 100,
      signalStrengthDbm: signalDbm || -65,
      firmwareVersion: 'v2.4.1',
      samplingIntervalSec: 15,
      lastSeen: new Date().toISOString(),
      sensors: Object.keys(sensors) as SensorType[],
      offlineQueueCount: 0,
      calibrationOffsets: {}
    });
  }

  const reading = {
    id: `read_${deviceId}_${Date.now()}`,
    deviceId,
    timestamp: timestamp || new Date().toISOString(),
    sensors,
    batteryPercent: batteryPercent ?? device.batteryPercent,
    signalDbm: signalDbm ?? device.signalStrengthDbm,
    isOfflineSynced: false
  };

  db.addReading(reading);

  const history = db.getReadings(deviceId);
  const evalRes = AnomalyDetectionEngine.evaluateReading(device, history, reading);
  evalRes.anomalies.forEach(a => db.addAnomaly(a));
  evalRes.alerts.forEach(al => db.addAlert(al));

  res.status(201).json({
    success: true,
    readingId: reading.id,
    anomaliesDetected: evalRes.anomalies.length,
    alertsTriggered: evalRes.alerts.length
  });
});

// Batch Sync Offline Cached Readings from ESP32 SPIFFS
app.post('/api/iot/batch-sync', (req, res) => {
  const { readings, deviceId } = req.body;
  if (!Array.isArray(readings) || readings.length === 0) {
    return res.status(400).json({ error: 'No readings in batch sync' });
  }

  const devId = deviceId || readings[0]?.deviceId;
  const count = db.addBatchReadings(devId, readings);

  res.json({
    success: true,
    synchronizedCount: count,
    message: `Successfully synchronized ${count} offline measurements.`
  });
});

// Alerts Management
app.get('/api/alerts', (req, res) => {
  const deviceId = req.query.deviceId as string;
  let alerts = db.getAlerts();
  if (deviceId) {
    alerts = alerts.filter(a => a.deviceId === deviceId);
  }
  res.json({ success: true, alerts });
});

app.post('/api/alerts/acknowledge', (req, res) => {
  const { alertId, acknowledgedBy } = req.body;
  if (!alertId) return res.status(400).json({ error: 'alertId required' });

  const updated = db.acknowledgeAlert(alertId, acknowledgedBy || 'Operator');
  if (!updated) return res.status(404).json({ error: 'Alert not found' });

  res.json({ success: true, alert: updated });
});

// Anomalies
app.get('/api/anomalies', (req, res) => {
  const deviceId = req.query.deviceId as string;
  let anomalies = db.getAnomalies();
  if (deviceId) {
    anomalies = anomalies.filter(a => a.deviceId === deviceId);
  }
  res.json({ success: true, anomalies });
});

// Sensor Health Diagnostics
app.get('/api/sensor-health', (req, res) => {
  const deviceId = (req.query.deviceId as string) || db.getDevices()[0]?.id;
  const device = db.getDeviceById(deviceId);
  if (!device) return res.status(404).json({ error: 'Device not found' });

  const history = db.getReadings(deviceId);
  const latest = history[history.length - 1];
  if (!latest) return res.json({ success: true, healthRecords: [] });

  const evalRes = AnomalyDetectionEngine.evaluateReading(device, history, latest);
  res.json({
    success: true,
    deviceId,
    healthRecords: evalRes.healthRecords,
    deviceUptimeHours: 720,
    batteryPercent: device.batteryPercent,
    signalDbm: device.signalStrengthDbm
  });
});

// Calibration Logs
app.get('/api/calibrations', (req, res) => {
  const deviceId = req.query.deviceId as string;
  const list = db.getCalibrations(deviceId);
  res.json({ success: true, calibrations: list });
});

app.post('/api/calibrations', (req, res) => {
  const { deviceId, sensorType, calibratedBy, bufferPoints, calculatedSlope, calculatedOffset, notes } = req.body;
  if (!deviceId || !sensorType) {
    return res.status(400).json({ error: 'deviceId and sensorType required' });
  }

  const log = db.addCalibration({
    id: `CAL-${Date.now()}`,
    deviceId,
    sensorType,
    timestamp: new Date().toISOString(),
    calibratedBy: calibratedBy || 'Technician',
    bufferPoints: bufferPoints || [],
    calculatedSlope: Number(calculatedSlope) || 1.0,
    calculatedOffset: Number(calculatedOffset) || 0.0,
    notes: notes || 'Routine Calibration'
  });

  res.status(201).json({ success: true, calibration: log });
});

// AI Analytics Assessment (Gemini 3.7 Flash)
app.post('/api/ai/analyze', async (req, res) => {
  const { deviceId } = req.body;
  const targetId = deviceId || db.getDevices()[0]?.id;
  const device = db.getDeviceById(targetId);

  if (!device) return res.status(404).json({ error: 'Device not found' });

  const recentReadings = db.getReadings(targetId, 20);
  try {
    const assessment = await analyzeWaterQualityWithAI(device, recentReadings);
    res.json({ success: true, assessment });
  } catch (err: any) {
    console.error('AI Assessment failed:', err);
    res.status(500).json({ error: 'AI Analysis error', message: err?.message });
  }
});

// AI Assistant Chat ("Ask HydroAI")
app.post('/api/ai/chat', async (req, res) => {
  const { message, deviceId, history } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const targetId = deviceId || db.getDevices()[0]?.id;
  const device = db.getDeviceById(targetId);
  if (!device) return res.status(404).json({ error: 'Device not found' });

  const recentReadings = db.getReadings(targetId, 15);
  try {
    const reply = await chatWithWaterAssistant(message, device, recentReadings, history || []);
    res.json({ success: true, reply });
  } catch (err: any) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'AI Chat error', message: err?.message });
  }
});

// Simulation Controls & Test Scenario Injector
app.post('/api/simulator/scenario', (req, res) => {
  const { deviceId, scenario } = req.body;
  const targetId = deviceId || db.getDevices()[0]?.id;
  iotSimulator.triggerScenario(targetId, scenario);
  res.json({ success: true, message: `Injected scenario "${scenario}" for device ${targetId}` });
});

app.post('/api/simulator/toggle', (req, res) => {
  const { running, intervalMs } = req.body;
  if (typeof running === 'boolean') {
    db.setSimulation(running, intervalMs);
    if (running) iotSimulator.start();
    else iotSimulator.stop();
  }
  res.json({
    success: true,
    running: db.isSimulationRunning(),
    intervalMs: db.getSimulationInterval()
  });
});

// Generate Hardware Firmware Code (.ino / C++)
app.get('/api/firmware/download', (req, res) => {
  const deviceId = (req.query.deviceId as string) || db.getDevices()[0]?.id;
  const device = db.getDeviceById(deviceId);
  if (!device) return res.status(404).json({ error: 'Device not found' });

  const serverUrl = `${req.protocol}://${req.get('host')}`;
  const code = generateESP32Firmware(device, serverUrl);

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${device.id}_firmware.ino"`);
  res.send(code);
});

// CSV Export for Historical Reports
app.get('/api/reports/export.csv', (req, res) => {
  const deviceId = (req.query.deviceId as string) || db.getDevices()[0]?.id;
  const readings = db.getReadings(deviceId);

  let csv = 'Timestamp,DeviceID,pH,Turbidity_NTU,Temperature_C,TDS_ppm,Conductivity_uS_cm,Dissolved_Oxygen_mg_L,ORP_mV,Water_Level_m,Free_Chlorine_mg_L,Nitrate_mg_L,Battery_Percent,Offline_Synced\n';
  readings.forEach(r => {
    csv += `"${r.timestamp}","${r.deviceId}",${r.sensors.pH ?? ''},${r.sensors.turbidity ?? ''},${r.sensors.temperature ?? ''},${r.sensors.tds ?? ''},${r.sensors.conductivity ?? ''},${r.sensors.dissolved_oxygen ?? ''},${r.sensors.orp ?? ''},${r.sensors.water_level ?? ''},${r.sensors.chlorine ?? ''},${r.sensors.nitrate ?? ''},${r.batteryPercent},${r.isOfflineSynced ? 'YES' : 'NO'}\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="HydroPulse_Telemetry_${deviceId}.csv"`);
  res.send(csv);
});

// ==========================================
// VITE OR STATIC FRONTEND SERVING
// ==========================================

async function bootstrap() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HydroPulse AI IoT Server running at http://0.0.0.0:${PORT}`);
  });
}

bootstrap();
