import { 
  SensorReading, 
  DeviceLocation, 
  AnomalyEvent, 
  AlertItem, 
  SensorType,
  SensorHealthRecord
} from '../src/types';
import { SENSOR_CONFIGS, CONTEXT_THRESHOLDS } from '../src/utils/sensorConfigs';

export class AnomalyDetectionEngine {
  // Evaluates the latest reading against historical buffer and thresholds
  public static evaluateReading(
    device: DeviceLocation,
    history: SensorReading[],
    current: SensorReading
  ): { anomalies: AnomalyEvent[]; alerts: AlertItem[]; healthRecords: SensorHealthRecord[] } {
    const anomalies: AnomalyEvent[] = [];
    const alerts: AlertItem[] = [];
    const healthRecords: SensorHealthRecord[] = [];

    const sensorKeys = Object.keys(current.sensors) as SensorType[];

    for (const sensorType of sensorKeys) {
      const value = current.sensors[sensorType];
      if (value === undefined || isNaN(value)) continue;

      const config = SENSOR_CONFIGS[sensorType];
      if (!config) continue;

      // 1. Check physical impossibility (Hardware disconnect / Short circuit)
      if (value < config.minPhysical || value > config.maxPhysical) {
        const anomaly: AnomalyEvent = {
          id: `ANO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          deviceId: device.id,
          deviceName: device.name,
          timestamp: current.timestamp,
          parameter: sensorType,
          anomalyType: 'impossible_value',
          severity: 'sensor_fault',
          confidence: 99,
          expectedRange: [config.minPhysical, config.maxPhysical],
          actualValue: value,
          description: `Reading ${value} ${config.unit} is outside physical hardware bounds (${config.minPhysical} - ${config.maxPhysical} ${config.unit}).`,
          rootCauseAnalysis: 'Probable analog cable disconnection, loose terminal, or ADC probe circuit fault.'
        };
        anomalies.push(anomaly);

        alerts.push({
          id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          deviceId: device.id,
          deviceName: device.name,
          timestamp: current.timestamp,
          parameter: sensorType,
          currentReading: value,
          unit: config.unit,
          expectedRange: `${config.minNormal} - ${config.maxNormal} ${config.unit}`,
          severity: 'sensor_fault',
          alertType: 'sensor_health',
          title: `Hardware Fault: ${config.name} probe out-of-bounds`,
          message: `The ${config.name} probe returned an impossible measurement (${value} ${config.unit}). Hardware check required.`,
          recommendedAction: `Inspect probe wiring on ${config.pin || 'analog input'}, verify 3.3V/5V supply rail, and check ADC reference.`,
          acknowledged: false,
          channelsSent: ['dashboard', 'email']
        });

        healthRecords.push({
          sensorType,
          name: config.name,
          status: 'faulty',
          issueType: 'out_of_bounds',
          reliabilityScore: 10,
          lastReading: value,
          unit: config.unit,
          lastCalibrated: device.calibrationOffsets?.[sensorType]?.lastCalibrated || 'Never',
          daysSinceCalibration: 30,
          suggestedAction: 'Replace probe or check terminal connections.'
        });
        continue;
      }

      // Extract historical values for this sensor
      const pastValues = history
        .map(h => h.sensors[sensorType])
        .filter((v): v is number => v !== undefined && !isNaN(v));

      // 2. Check for Stuck Sensor (Constant flatline over > 10 readings)
      if (pastValues.length >= 10) {
        const last10 = pastValues.slice(-10);
        const minVal = Math.min(...last10);
        const maxVal = Math.max(...last10);
        const variance = maxVal - minVal;

        if (variance === 0 && config.step <= 0.1) {
          anomalies.push({
            id: `ANO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            deviceId: device.id,
            deviceName: device.name,
            timestamp: current.timestamp,
            parameter: sensorType,
            anomalyType: 'stuck_reading',
            severity: 'warning',
            confidence: 91,
            expectedRange: [minVal - 0.5, maxVal + 0.5],
            actualValue: value,
            description: `${config.name} has maintained a zero-variance flatline (${value} ${config.unit}) across 10+ consecutive samples.`,
            rootCauseAnalysis: 'Electrode surface fouling, sensor freezing, or firmware ADC buffer freeze.'
          });

          healthRecords.push({
            sensorType,
            name: config.name,
            status: 'warning',
            issueType: 'stuck',
            reliabilityScore: 45,
            lastReading: value,
            unit: config.unit,
            lastCalibrated: device.calibrationOffsets?.[sensorType]?.lastCalibrated || 'Unknown',
            daysSinceCalibration: 14,
            suggestedAction: 'Rinse glass bulb/electrode, perform physical stir test to verify dynamic response.'
          });
          continue;
        }
      }

      // 3. Statistical Z-Score Anomaly Detection
      if (pastValues.length >= 15) {
        const mean = pastValues.reduce((acc, v) => acc + v, 0) / pastValues.length;
        const stdDev = Math.sqrt(
          pastValues.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / pastValues.length
        );

        if (stdDev > 0.001) {
          const zScore = Math.abs((value - mean) / stdDev);

          if (zScore > 3.2) {
            // Significant statistical anomaly detected (>3 sigma)
            const isSpike = value > mean;
            const anomaly: AnomalyEvent = {
              id: `ANO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              deviceId: device.id,
              deviceName: device.name,
              timestamp: current.timestamp,
              parameter: sensorType,
              anomalyType: isSpike ? 'spike' : 'drop',
              severity: zScore > 4.5 ? 'critical' : 'warning',
              confidence: Math.min(99, Math.round(75 + zScore * 5)),
              expectedRange: [Number((mean - 2 * stdDev).toFixed(2)), Number((mean + 2 * stdDev).toFixed(2))],
              actualValue: value,
              description: `Statistical ${isSpike ? 'spike' : 'drop'} detected (Z-Score: ${zScore.toFixed(1)}σ, Mean: ${mean.toFixed(2)} ${config.unit}).`,
              rootCauseAnalysis: `Sudden deviation from 24h baseline. May indicate hydraulic pulse, localized contaminant influx, or upstream valve operation.`
            };
            anomalies.push(anomaly);

            alerts.push({
              id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              deviceId: device.id,
              deviceName: device.name,
              timestamp: current.timestamp,
              parameter: sensorType,
              currentReading: value,
              unit: config.unit,
              expectedRange: `${(mean - 2 * stdDev).toFixed(1)} - ${(mean + 2 * stdDev).toFixed(1)} ${config.unit}`,
              severity: zScore > 4.5 ? 'critical' : 'warning',
              alertType: 'ai_anomaly',
              title: `AI Anomaly: Sudden ${config.name} ${isSpike ? 'Surge' : 'Drop'}`,
              message: `${config.name} shifted abruptly to ${value} ${config.unit} (baseline: ${mean.toFixed(1)} ${config.unit}).`,
              recommendedAction: `Check upstream catchment, confirm secondary sensor consistency, and sample manually if condition persists.`,
              acknowledged: false,
              channelsSent: ['dashboard', 'push', 'email']
            });
          }
        }
      }

      // 4. Standard Operational Threshold Checks
      const ctxLimits = CONTEXT_THRESHOLDS[device.context]?.[sensorType] || {
        min: config.minNormal,
        max: config.maxNormal
      };

      if (value < ctxLimits.min || value > ctxLimits.max) {
        const isCritical = value < config.minWarning || value > config.maxWarning;
        alerts.push({
          id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          deviceId: device.id,
          deviceName: device.name,
          timestamp: current.timestamp,
          parameter: sensorType,
          currentReading: value,
          unit: config.unit,
          expectedRange: `${ctxLimits.min} - ${ctxLimits.max} ${config.unit}`,
          severity: isCritical ? 'critical' : 'warning',
          alertType: 'threshold',
          title: `${config.name} Out of Recommended Range`,
          message: `${config.name} is measured at ${value} ${config.unit} (standard range: ${ctxLimits.min} - ${ctxLimits.max} ${config.unit} for ${device.waterSourceType}).`,
          recommendedAction: config.standardsGuide,
          acknowledged: false,
          channelsSent: ['dashboard', 'email']
        });
      }

      // Healthy sensor record
      if (!healthRecords.find(h => h.sensorType === sensorType)) {
        healthRecords.push({
          sensorType,
          name: config.name,
          status: 'healthy',
          issueType: 'none',
          reliabilityScore: 98,
          lastReading: value,
          unit: config.unit,
          lastCalibrated: device.calibrationOffsets?.[sensorType]?.lastCalibrated || new Date(Date.now() - 86400000 * 5).toISOString(),
          daysSinceCalibration: 5,
          suggestedAction: 'Operating normally. Next routine calibration due in 25 days.'
        });
      }
    }

    // 5. Battery and Connectivity checks
    if (current.batteryPercent < 20) {
      alerts.push({
        id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        deviceId: device.id,
        deviceName: device.name,
        timestamp: current.timestamp,
        parameter: 'system',
        severity: current.batteryPercent < 10 ? 'critical' : 'warning',
        alertType: 'sensor_health',
        title: `Low Battery Warning (${current.batteryPercent}%)`,
        message: `IoT Station battery has dropped to ${current.batteryPercent}%. Station may shut down into deep sleep to preserve memory.`,
        recommendedAction: 'Inspect solar charging panel or replace LiPo/LiFePO4 battery pack.',
        acknowledged: false,
        channelsSent: ['dashboard', 'sms']
      });
    }

    return { anomalies, alerts, healthRecords };
  }
}
