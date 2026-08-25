export type SensorType = 
  | 'pH'
  | 'turbidity'
  | 'temperature'
  | 'tds'
  | 'conductivity'
  | 'dissolved_oxygen'
  | 'orp'
  | 'water_level'
  | 'chlorine'
  | 'nitrate';

export type AlertSeverity = 'normal' | 'warning' | 'critical' | 'sensor_fault';
export type WaterStatus = 'optimal' | 'acceptable' | 'warning' | 'critical';
export type DeviceStatus = 'online' | 'warning' | 'critical' | 'offline';
export type UserRole = 'admin' | 'operator' | 'viewer';
export type WaterContext = 'drinking' | 'aquaculture' | 'agriculture' | 'industrial' | 'recreational';
export type SimulationScenario = 
  | 'baseline' 
  | 'high_turbidity' 
  | 'acidic_surge' 
  | 'alkaline_surge' 
  | 'dissolved_oxygen_drop' 
  | 'tds_spike' 
  | 'sensor_fault_ph' 
  | 'offline_sync';

export interface SensorConfig {
  type: SensorType;
  name: string;
  unit: string;
  minNormal: number;
  maxNormal: number;
  minWarning: number;
  maxWarning: number;
  minPhysical: number;
  maxPhysical: number;
  step: number;
  pin?: string;
  iconName: string;
  description: string;
  standardsGuide: string;
}

export interface SensorReading {
  id?: string;
  deviceId: string;
  timestamp: string; // ISO String
  sensors: Record<SensorType, number>;
  batteryPercent: number;
  signalDbm: number;
  isOfflineSynced?: boolean;
  rawAdc?: Record<string, number>;
}

export interface DeviceLocation {
  id: string;
  name: string;
  locationName: string;
  waterSourceType: string;
  context: WaterContext;
  latitude: number;
  longitude: number;
  status: DeviceStatus;
  batteryPercent: number;
  signalStrengthDbm: number;
  firmwareVersion: string;
  samplingIntervalSec: number;
  lastSeen: string;
  sensors: SensorType[];
  offlineQueueCount: number;
  isSimulated?: boolean;
  calibrationOffsets: Partial<Record<SensorType, { offset: number; slope: number; lastCalibrated: string }>>;
}

export interface AnomalyEvent {
  id: string;
  deviceId: string;
  deviceName: string;
  timestamp: string;
  parameter: SensorType;
  anomalyType: 'spike' | 'drop' | 'sudden_jump' | 'gradual_drift' | 'stuck_reading' | 'multi_parameter_pattern' | 'impossible_value';
  severity: AlertSeverity;
  confidence: number; // 0 - 100%
  expectedRange: [number, number];
  actualValue: number;
  description: string;
  rootCauseAnalysis?: string;
}

export interface AlertItem {
  id: string;
  deviceId: string;
  deviceName: string;
  timestamp: string;
  parameter: SensorType | 'system' | 'multi_parameter';
  currentReading?: number;
  unit?: string;
  expectedRange?: string;
  severity: AlertSeverity;
  alertType: 'threshold' | 'ai_anomaly' | 'trend_prediction' | 'sensor_health';
  title: string;
  message: string;
  recommendedAction: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  channelsSent: ('dashboard' | 'push' | 'email' | 'sms')[];
}

export interface WaterQualityAssessment {
  overallScore: number; // 0 to 100 (100 is pristine)
  status: WaterStatus;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Severe';
  trend: 'Improving' | 'Stable' | 'Deteriorating';
  activeAnomaliesCount: number;
  summary: string;
  aiExplanation: string;
  confidenceScore: number;
  potentialContaminants: {
    name: string;
    probability: number;
    indicators: string[];
    riskFactor: string;
  }[];
  forecast: {
    timeframe: string;
    predictedStatus: WaterStatus;
    predictedRisk: string;
    probability: number;
    keyRiskFactors: string[];
  }[];
  multiParameterCorrelations: {
    pair: string;
    correlation: string;
    significance: string;
  }[];
}

export interface SensorHealthRecord {
  sensorType: SensorType;
  name: string;
  status: 'healthy' | 'warning' | 'faulty' | 'needs_calibration';
  issueType?: 'stuck' | 'noise' | 'drift' | 'out_of_bounds' | 'hardware_disconnect' | 'none';
  reliabilityScore: number; // 0 - 100%
  lastReading: number;
  unit: string;
  lastCalibrated: string;
  daysSinceCalibration: number;
  suggestedAction: string;
}

export interface SystemStats {
  totalDevices: number;
  onlineDevices: number;
  warningDevices: number;
  criticalDevices: number;
  activeAlerts: number;
  readingsCount24h: number;
  systemUptimePercent: number;
  lastSyncTime: string;
}

export interface CalibrationLog {
  id: string;
  deviceId: string;
  sensorType: SensorType;
  timestamp: string;
  calibratedBy: string;
  bufferPoints: { target: number; measuredRaw: number }[];
  calculatedSlope: number;
  calculatedOffset: number;
  notes: string;
}
