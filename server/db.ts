import { 
  DeviceLocation, 
  SensorReading, 
  AlertItem, 
  AnomalyEvent, 
  CalibrationLog, 
  SensorType,
  WaterQualityAssessment
} from '../src/types';
import { SENSOR_CONFIGS } from '../src/utils/sensorConfigs';

// In-Memory Database with realistic seed data
export interface DBState {
  devices: DeviceLocation[];
  readings: Record<string, SensorReading[]>; // deviceId -> SensorReading[]
  alerts: AlertItem[];
  anomalies: AnomalyEvent[];
  calibrations: CalibrationLog[];
  simulationRunning: boolean;
  simulationIntervalMs: number;
}

export const INITIAL_DEVICES: DeviceLocation[] = [
  {
    id: 'ESP32-WQM-001',
    name: 'Main Reservoir & Treatment Inflow',
    locationName: 'Central District Water Plant #1',
    waterSourceType: 'Municipal Reservoir',
    context: 'drinking',
    latitude: 37.7749,
    longitude: -122.4194,
    status: 'online',
    batteryPercent: 96,
    signalStrengthDbm: -62,
    firmwareVersion: 'v2.4.1-ota',
    samplingIntervalSec: 15,
    lastSeen: new Date().toISOString(),
    sensors: ['pH', 'turbidity', 'temperature', 'tds', 'conductivity', 'dissolved_oxygen', 'orp', 'water_level', 'chlorine'],
    offlineQueueCount: 0,
    isSimulated: true,
    calibrationOffsets: {
      pH: { offset: 0.02, slope: 1.01, lastCalibrated: new Date(Date.now() - 86400000 * 4).toISOString() },
      turbidity: { offset: 0.1, slope: 0.99, lastCalibrated: new Date(Date.now() - 86400000 * 12).toISOString() },
      tds: { offset: -2.5, slope: 1.0, lastCalibrated: new Date(Date.now() - 86400000 * 20).toISOString() }
    }
  },
  {
    id: 'ESP32-WQM-002',
    name: 'North Hill Elevated Water Tank',
    locationName: 'North Hill Community Station',
    waterSourceType: 'Overhead Storage Tank',
    context: 'drinking',
    latitude: 37.7885,
    longitude: -122.4075,
    status: 'online',
    batteryPercent: 88,
    signalStrengthDbm: -71,
    firmwareVersion: 'v2.4.1-ota',
    samplingIntervalSec: 30,
    lastSeen: new Date().toISOString(),
    sensors: ['pH', 'turbidity', 'temperature', 'tds', 'water_level', 'chlorine'],
    offlineQueueCount: 0,
    isSimulated: true,
    calibrationOffsets: {}
  },
  {
    id: 'ESP32-WQM-003',
    name: 'Pine Valley Aquaculture Pond #4',
    locationName: 'Pine Valley Eco-Fish Hatchery',
    waterSourceType: 'Aquaculture Pond',
    context: 'aquaculture',
    latitude: 37.7510,
    longitude: -122.4477,
    status: 'warning',
    batteryPercent: 64,
    signalStrengthDbm: -82,
    firmwareVersion: 'v2.3.9',
    samplingIntervalSec: 20,
    lastSeen: new Date().toISOString(),
    sensors: ['pH', 'temperature', 'dissolved_oxygen', 'turbidity', 'conductivity', 'nitrate'],
    offlineQueueCount: 0,
    isSimulated: true,
    calibrationOffsets: {}
  },
  {
    id: 'ESP32-WQM-004',
    name: 'Metro River Basin & Effluent Canal',
    locationName: 'Riverview Industrial Intake Buffer',
    waterSourceType: 'River Waterway',
    context: 'industrial',
    latitude: 37.7320,
    longitude: -122.3850,
    status: 'online',
    batteryPercent: 92,
    signalStrengthDbm: -68,
    firmwareVersion: 'v2.4.1-ota',
    samplingIntervalSec: 25,
    lastSeen: new Date().toISOString(),
    sensors: ['pH', 'turbidity', 'temperature', 'tds', 'conductivity', 'dissolved_oxygen', 'orp', 'nitrate'],
    offlineQueueCount: 0,
    isSimulated: true,
    calibrationOffsets: {}
  },
  {
    id: 'ESP32-WQM-005',
    name: 'Oakwood Primary School Tap Distribution',
    locationName: 'Oakwood School Utility Room',
    waterSourceType: 'School Drinking Point',
    context: 'drinking',
    latitude: 37.7650,
    longitude: -122.4220,
    status: 'online',
    batteryPercent: 100,
    signalStrengthDbm: -55,
    firmwareVersion: 'v2.4.1-ota',
    samplingIntervalSec: 60,
    lastSeen: new Date().toISOString(),
    sensors: ['pH', 'turbidity', 'tds', 'temperature', 'chlorine'],
    offlineQueueCount: 0,
    isSimulated: true,
    calibrationOffsets: {}
  }
];

// Helper to generate historical readings over the past 30 days
function generateSeedReadings(deviceId: string, context: string): SensorReading[] {
  const readings: SensorReading[] = [];
  const now = Date.now();
  // Generate points: 100 points over the last 24 hours + hourly points going back 7 days
  const pointsCount = 120;
  const intervalMs = (24 * 60 * 60 * 1000) / pointsCount;

  let basePh = 7.35;
  let baseTurbidity = 1.2;
  let baseTemp = 19.5;
  let baseTds = 180;
  let baseEc = 360;
  let baseDo = 8.2;
  let baseOrp = 680;
  let baseLevel = 3.65;
  let baseChlorine = 1.1;
  let baseNitrate = 2.4;

  if (context === 'aquaculture') {
    basePh = 7.6;
    baseTurbidity = 12.0;
    baseTemp = 24.2;
    baseDo = 6.1; // lower for aquaculture
    baseNitrate = 4.8;
  } else if (context === 'industrial') {
    basePh = 7.1;
    baseTurbidity = 4.5;
    baseTds = 420;
    baseEc = 840;
    baseOrp = 450;
  }

  for (let i = pointsCount; i >= 0; i--) {
    const timestamp = new Date(now - i * intervalMs).toISOString();
    // Add sinusoidal diurnal pattern + slight noise
    const timeFactor = Math.sin((i / 12) * Math.PI);
    const noise = (Math.random() - 0.5) * 0.15;

    // Inject an event 3 hours ago for realistic anomaly demo
    const isAnomalyWindow = i >= 12 && i <= 16 && deviceId === 'ESP32-WQM-001';
    const anomalyFactor = isAnomalyWindow ? 2.8 : 1.0;

    readings.push({
      id: `read_${deviceId}_${now - i * intervalMs}`,
      deviceId,
      timestamp,
      sensors: {
        pH: Number((basePh + (noise * 0.4) - (isAnomalyWindow ? 0.6 : 0)).toFixed(2)),
        turbidity: Number((baseTurbidity * anomalyFactor + Math.abs(noise * 2)).toFixed(2)),
        temperature: Number((baseTemp + timeFactor * 1.5 + noise).toFixed(1)),
        tds: Number((baseTds * (isAnomalyWindow ? 1.4 : 1.0) + noise * 10).toFixed(0)),
        conductivity: Number((baseEc * (isAnomalyWindow ? 1.4 : 1.0) + noise * 20).toFixed(0)),
        dissolved_oxygen: Number((Math.max(3.0, baseDo - timeFactor * 0.5 - (isAnomalyWindow ? 1.5 : 0) + noise * 0.3)).toFixed(2)),
        orp: Number((baseOrp - (isAnomalyWindow ? 120 : 0) + noise * 15).toFixed(0)),
        water_level: Number((baseLevel + Math.sin(i / 20) * 0.4 + noise * 0.05).toFixed(2)),
        chlorine: Number((Math.max(0.1, baseChlorine - (isAnomalyWindow ? 0.4 : 0) + noise * 0.1)).toFixed(2)),
        nitrate: Number((baseNitrate + (isAnomalyWindow ? 3.5 : 0) + noise * 0.5).toFixed(1))
      },
      batteryPercent: Math.max(70, Math.min(100, Math.round(98 - (i * 0.05)))),
      signalDbm: -60 - Math.round(Math.random() * 12),
      isOfflineSynced: i > 80 && i < 85 // demo some offline synced points
    });
  }

  return readings;
}

export const INITIAL_ALERTS: AlertItem[] = [
  {
    id: 'ALT-1082',
    deviceId: 'ESP32-WQM-001',
    deviceName: 'Main Reservoir & Treatment Inflow',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    parameter: 'turbidity',
    currentReading: 5.4,
    unit: 'NTU',
    expectedRange: '0.0 - 4.0 NTU',
    severity: 'warning',
    alertType: 'ai_anomaly',
    title: 'Sudden Turbidity Inflow Spike Detected',
    message: 'Turbidity increased by +340% within a 20-minute window alongside a minor dip in ORP and pH.',
    recommendedAction: 'Inspect upstream primary sedimentation filter beds and verify flocculant dosage pump.',
    acknowledged: false,
    channelsSent: ['dashboard', 'email', 'push']
  },
  {
    id: 'ALT-1081',
    deviceId: 'ESP32-WQM-003',
    deviceName: 'Pine Valley Aquaculture Pond #4',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    parameter: 'dissolved_oxygen',
    currentReading: 4.2,
    unit: 'mg/L',
    expectedRange: '5.5 - 10.0 mg/L',
    severity: 'warning',
    alertType: 'threshold',
    title: 'Low Dissolved Oxygen Threshold Warning',
    message: 'Dissolved Oxygen dropped below 4.5 mg/L during the early morning hours, creating potential hypoxia risk.',
    recommendedAction: 'Engage secondary paddlewheel aerators and inspect pond surface for organic debris accumulation.',
    acknowledged: true,
    acknowledgedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    acknowledgedBy: 'Operator (Alex Rivera)',
    channelsSent: ['dashboard', 'sms']
  },
  {
    id: 'ALT-1079',
    deviceId: 'ESP32-WQM-004',
    deviceName: 'Metro River Basin & Effluent Canal',
    timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    parameter: 'nitrate',
    currentReading: 14.8,
    unit: 'mg/L',
    expectedRange: '0.0 - 10.0 mg/L',
    severity: 'warning',
    alertType: 'threshold',
    title: 'Elevated Nitrate Concentration',
    message: 'Nitrate levels exceeded standard baseline following storm drain surface runoff.',
    recommendedAction: 'Log discharge event with district water board and schedule confirmatory wet-lab ion chromatography.',
    acknowledged: true,
    acknowledgedAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    acknowledgedBy: 'Admin (System)',
    channelsSent: ['dashboard', 'email']
  }
];

export const INITIAL_ANOMALIES: AnomalyEvent[] = [
  {
    id: 'ANO-901',
    deviceId: 'ESP32-WQM-001',
    deviceName: 'Main Reservoir & Treatment Inflow',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    parameter: 'turbidity',
    anomalyType: 'spike',
    severity: 'warning',
    confidence: 94,
    expectedRange: [0.8, 1.8],
    actualValue: 5.4,
    description: 'Sudden high-gradient step change in optical backscatter readings exceeding 3-sigma baseline.',
    rootCauseAnalysis: 'Likely sediment mobilization or localized upstream pipe pressure surge.'
  },
  {
    id: 'ANO-902',
    deviceId: 'ESP32-WQM-001',
    deviceName: 'Main Reservoir & Treatment Inflow',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    parameter: 'pH',
    anomalyType: 'drop',
    severity: 'normal',
    confidence: 82,
    expectedRange: [7.2, 7.6],
    actualValue: 6.75,
    description: 'Correlated mild acidification accompanying turbidity increase.',
    rootCauseAnalysis: 'Rainwater or organic acid influx common during rapid runoff.'
  },
  {
    id: 'ANO-899',
    deviceId: 'ESP32-WQM-003',
    deviceName: 'Pine Valley Aquaculture Pond #4',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    parameter: 'dissolved_oxygen',
    anomalyType: 'drop',
    severity: 'warning',
    confidence: 89,
    expectedRange: [5.8, 8.5],
    actualValue: 4.2,
    description: 'Extended nocturnal respiratory depletion of dissolved oxygen.',
    rootCauseAnalysis: 'High biological oxygen demand (BOD) from algal biomass.'
  }
];

export const INITIAL_CALIBRATIONS: CalibrationLog[] = [
  {
    id: 'CAL-001',
    deviceId: 'ESP32-WQM-001',
    sensorType: 'pH',
    timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
    calibratedBy: 'Lead Tech (David Kim)',
    bufferPoints: [
      { target: 4.01, measuredRaw: 1980 },
      { target: 7.00, measuredRaw: 1650 },
      { target: 10.01, measuredRaw: 1315 }
    ],
    calculatedSlope: 1.01,
    calculatedOffset: 0.02,
    notes: '2-point precision buffer calibration using NIST traceable standard solutions. Response time: 4s.'
  },
  {
    id: 'CAL-002',
    deviceId: 'ESP32-WQM-001',
    sensorType: 'turbidity',
    timestamp: new Date(Date.now() - 86400000 * 12).toISOString(),
    calibratedBy: 'Field Tech (Elena Rostova)',
    bufferPoints: [
      { target: 0.0, measuredRaw: 4095 },
      { target: 100.0, measuredRaw: 2850 }
    ],
    calculatedSlope: 0.99,
    calculatedOffset: 0.1,
    notes: 'Zeroed with deionized purified water. Calibrated against 100 NTU Formazin standard.'
  }
];

// Singleton Database Manager
class DatabaseManager {
  private state: DBState;

  constructor() {
    const readingsMap: Record<string, SensorReading[]> = {};
    INITIAL_DEVICES.forEach(dev => {
      readingsMap[dev.id] = generateSeedReadings(dev.id, dev.context);
    });

    this.state = {
      devices: [...INITIAL_DEVICES],
      readings: readingsMap,
      alerts: [...INITIAL_ALERTS],
      anomalies: [...INITIAL_ANOMALIES],
      calibrations: [...INITIAL_CALIBRATIONS],
      simulationRunning: true,
      simulationIntervalMs: 5000
    };
  }

  public getDevices(): DeviceLocation[] {
    return this.state.devices;
  }

  public getDeviceById(id: string): DeviceLocation | undefined {
    return this.state.devices.find(d => d.id === id);
  }

  public addDevice(device: DeviceLocation): DeviceLocation {
    this.state.devices.push(device);
    if (!this.state.readings[device.id]) {
      this.state.readings[device.id] = generateSeedReadings(device.id, device.context);
    }
    return device;
  }

  public updateDevice(id: string, updates: Partial<DeviceLocation>): DeviceLocation | undefined {
    const idx = this.state.devices.findIndex(d => d.id === id);
    if (idx !== -1) {
      this.state.devices[idx] = { ...this.state.devices[idx], ...updates };
      return this.state.devices[idx];
    }
    return undefined;
  }

  public deleteDevice(id: string): boolean {
    const initialLen = this.state.devices.length;
    this.state.devices = this.state.devices.filter(d => d.id !== id);
    delete this.state.readings[id];
    return this.state.devices.length < initialLen;
  }

  public getReadings(deviceId: string, limit?: number): SensorReading[] {
    const list = this.state.readings[deviceId] || [];
    if (limit && limit > 0) {
      return list.slice(-limit);
    }
    return list;
  }

  public addReading(reading: SensorReading): void {
    if (!this.state.readings[reading.deviceId]) {
      this.state.readings[reading.deviceId] = [];
    }
    this.state.readings[reading.deviceId].push(reading);
    // Keep max 500 readings in memory per device
    if (this.state.readings[reading.deviceId].length > 500) {
      this.state.readings[reading.deviceId].shift();
    }

    // Update device last seen
    const dev = this.getDeviceById(reading.deviceId);
    if (dev) {
      dev.lastSeen = reading.timestamp;
      dev.batteryPercent = reading.batteryPercent;
      dev.signalStrengthDbm = reading.signalDbm;
    }
  }

  public addBatchReadings(deviceId: string, readings: SensorReading[]): number {
    if (!this.state.readings[deviceId]) {
      this.state.readings[deviceId] = [];
    }
    // Sort and append
    readings.forEach(r => {
      r.isOfflineSynced = true;
      this.state.readings[deviceId].push(r);
    });
    this.state.readings[deviceId].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (this.state.readings[deviceId].length > 500) {
      this.state.readings[deviceId] = this.state.readings[deviceId].slice(-500);
    }
    return readings.length;
  }

  public getAlerts(): AlertItem[] {
    return this.state.alerts;
  }

  public addAlert(alert: AlertItem): AlertItem {
    this.state.alerts.unshift(alert);
    if (this.state.alerts.length > 100) {
      this.state.alerts.pop();
    }
    return alert;
  }

  public acknowledgeAlert(id: string, ackBy: string): AlertItem | undefined {
    const alert = this.state.alerts.find(a => a.id === id);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      alert.acknowledgedBy = ackBy;
      return alert;
    }
    return undefined;
  }

  public getAnomalies(): AnomalyEvent[] {
    return this.state.anomalies;
  }

  public addAnomaly(anomaly: AnomalyEvent): AnomalyEvent {
    this.state.anomalies.unshift(anomaly);
    if (this.state.anomalies.length > 100) {
      this.state.anomalies.pop();
    }
    return anomaly;
  }

  public getCalibrations(deviceId?: string): CalibrationLog[] {
    if (deviceId) {
      return this.state.calibrations.filter(c => c.deviceId === deviceId);
    }
    return this.state.calibrations;
  }

  public addCalibration(calibration: CalibrationLog): CalibrationLog {
    this.state.calibrations.unshift(calibration);
    // Update device calibration cache
    const dev = this.getDeviceById(calibration.deviceId);
    if (dev) {
      if (!dev.calibrationOffsets) dev.calibrationOffsets = {};
      dev.calibrationOffsets[calibration.sensorType] = {
        offset: calibration.calculatedOffset,
        slope: calibration.calculatedSlope,
        lastCalibrated: calibration.timestamp
      };
    }
    return calibration;
  }

  public setSimulation(running: boolean, intervalMs?: number) {
    this.state.simulationRunning = running;
    if (intervalMs) this.state.simulationIntervalMs = intervalMs;
  }

  public isSimulationRunning(): boolean {
    return this.state.simulationRunning;
  }

  public getSimulationInterval(): number {
    return this.state.simulationIntervalMs;
  }
}

export const db = new DatabaseManager();
