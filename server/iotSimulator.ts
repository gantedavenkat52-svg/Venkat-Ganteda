import { db } from './db';
import { AnomalyDetectionEngine } from './anomalyDetector';
import { SensorReading, SensorType } from '../src/types';

class IoTSimulator {
  private timer: NodeJS.Timeout | null = null;
  private scenarioQueue: { deviceId: string; type: string; stepsLeft: number; factor: number }[] = [];

  public start() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.tick();
    }, db.getSimulationInterval());
    console.log('[IoTSimulator] Started IoT telemetry background ticker.');
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public triggerScenario(deviceId: string, scenarioType: 'turbidity_spike' | 'ph_drop' | 'hypoxia' | 'probe_fault' | 'offline_sync') {
    if (scenarioType === 'turbidity_spike') {
      this.scenarioQueue.push({ deviceId, type: 'turbidity_spike', stepsLeft: 6, factor: 4.5 });
    } else if (scenarioType === 'ph_drop') {
      this.scenarioQueue.push({ deviceId, type: 'ph_drop', stepsLeft: 6, factor: -1.4 });
    } else if (scenarioType === 'hypoxia') {
      this.scenarioQueue.push({ deviceId, type: 'hypoxia', stepsLeft: 8, factor: -3.8 });
    } else if (scenarioType === 'probe_fault') {
      this.scenarioQueue.push({ deviceId, type: 'probe_fault', stepsLeft: 4, factor: 999.0 });
    } else if (scenarioType === 'offline_sync') {
      // Simulate generating 10 offline readings and then batch syncing them
      const dev = db.getDeviceById(deviceId);
      if (dev) {
        const now = Date.now();
        const batch: SensorReading[] = [];
        for (let i = 10; i >= 1; i--) {
          batch.push({
            id: `offline_${deviceId}_${now - i * 60000}`,
            deviceId,
            timestamp: new Date(now - i * 60000).toISOString(),
            sensors: {
              pH: 7.32 + (Math.random() - 0.5) * 0.1,
              turbidity: 1.4 + Math.random() * 0.4,
              temperature: 20.2 + (Math.random() - 0.5) * 0.5,
              tds: 185 + Math.round((Math.random() - 0.5) * 10),
              conductivity: 370 + Math.round((Math.random() - 0.5) * 20),
              dissolved_oxygen: 7.9 + (Math.random() - 0.5) * 0.3,
              orp: 670 + Math.round((Math.random() - 0.5) * 15),
              water_level: 3.6 + (Math.random() - 0.5) * 0.05,
              chlorine: 1.1 + (Math.random() - 0.5) * 0.08,
              nitrate: 2.3 + (Math.random() - 0.5) * 0.2
            },
            batteryPercent: Math.max(10, dev.batteryPercent - 2),
            signalDbm: -65,
            isOfflineSynced: true
          });
        }
        db.addBatchReadings(deviceId, batch);
        dev.offlineQueueCount = 0;
      }
    }
  }

  private tick() {
    if (!db.isSimulationRunning()) return;

    const devices = db.getDevices();
    const now = new Date().toISOString();

    for (const dev of devices) {
      if (dev.status === 'offline' && !dev.isSimulated) continue;

      const history = db.getReadings(dev.id);
      const last = history[history.length - 1];

      // Check active scenarios
      const activeScen = this.scenarioQueue.find(s => s.deviceId === dev.id);
      if (activeScen) {
        activeScen.stepsLeft--;
        if (activeScen.stepsLeft <= 0) {
          this.scenarioQueue = this.scenarioQueue.filter(s => s !== activeScen);
        }
      }

      const noise = (Math.random() - 0.5) * 0.08;
      const hour = new Date().getHours();
      const diurnalTemp = Math.sin(((hour - 6) / 24) * 2 * Math.PI) * 1.5;

      const prevPh = last?.sensors?.pH ?? 7.35;
      const prevTurb = last?.sensors?.turbidity ?? 1.2;
      const prevTemp = 19.5 + diurnalTemp;
      const prevTds = last?.sensors?.tds ?? 180;
      const prevDo = last?.sensors?.dissolved_oxygen ?? 8.1;
      const prevOrp = last?.sensors?.orp ?? 680;
      const prevLevel = last?.sensors?.water_level ?? 3.65;
      const prevChlorine = last?.sensors?.chlorine ?? 1.15;
      const prevNitrate = last?.sensors?.nitrate ?? 2.4;

      // Base readings
      let nextPh = Number((prevPh + (7.35 - prevPh) * 0.1 + noise * 0.2).toFixed(2));
      let nextTurb = Number((Math.max(0.1, prevTurb + (1.2 - prevTurb) * 0.1 + Math.abs(noise))).toFixed(2));
      let nextTemp = Number((prevTemp + noise * 0.5).toFixed(1));
      let nextTds = Math.round(prevTds + (180 - prevTds) * 0.1 + noise * 5);
      let nextEc = nextTds * 2;
      let nextDo = Number((Math.max(2.0, prevDo + (8.0 - prevDo) * 0.1 + noise * 0.2)).toFixed(2));
      let nextOrp = Math.round(prevOrp + (680 - prevOrp) * 0.1 + noise * 8);
      let nextLevel = Number((Math.max(0.5, prevLevel + Math.sin(Date.now() / 60000) * 0.01 + noise * 0.01)).toFixed(2));
      let nextChlorine = Number((Math.max(0.05, prevChlorine + (1.1 - prevChlorine) * 0.05 + noise * 0.05)).toFixed(2));
      let nextNitrate = Number((Math.max(0.1, prevNitrate + (2.4 - prevNitrate) * 0.05 + noise * 0.1)).toFixed(1));

      // Apply active test scenario adjustments
      if (activeScen) {
        if (activeScen.type === 'turbidity_spike') {
          nextTurb = Number((nextTurb * activeScen.factor + 3.0).toFixed(2));
          nextTds = Math.round(nextTds * 1.35);
          nextEc = nextTds * 2;
          nextOrp -= 80;
        } else if (activeScen.type === 'ph_drop') {
          nextPh = Number((nextPh + activeScen.factor).toFixed(2));
        } else if (activeScen.type === 'hypoxia') {
          nextDo = Number((Math.max(1.8, nextDo + activeScen.factor)).toFixed(2));
        } else if (activeScen.type === 'probe_fault') {
          nextPh = 99.9; // Impossible physical value
        }
      }

      // Context adjustments
      if (dev.context === 'aquaculture') {
        nextTurb = Number((nextTurb + 8.5).toFixed(1));
        nextDo = Number((Math.max(3.5, nextDo - 1.8)).toFixed(2));
      } else if (dev.context === 'industrial') {
        nextTds += 180;
        nextEc += 360;
      }

      const reading: SensorReading = {
        id: `read_${dev.id}_${Date.now()}`,
        deviceId: dev.id,
        timestamp: now,
        sensors: {
          pH: nextPh,
          turbidity: nextTurb,
          temperature: nextTemp,
          tds: nextTds,
          conductivity: nextEc,
          dissolved_oxygen: nextDo,
          orp: nextOrp,
          water_level: nextLevel,
          chlorine: nextChlorine,
          nitrate: nextNitrate
        },
        batteryPercent: Math.max(15, dev.batteryPercent),
        signalDbm: -60 - Math.round(Math.random() * 12),
        isOfflineSynced: false
      };

      db.addReading(reading);

      // Run automated anomaly & threshold engine
      const evalRes = AnomalyDetectionEngine.evaluateReading(dev, history, reading);

      evalRes.anomalies.forEach(a => db.addAnomaly(a));
      evalRes.alerts.forEach(al => db.addAlert(al));

      // Update device health status
      if (evalRes.alerts.some(a => a.severity === 'critical')) {
        dev.status = 'critical';
      } else if (evalRes.alerts.some(a => a.severity === 'warning')) {
        dev.status = 'warning';
      } else {
        dev.status = 'online';
      }
    }
  }
}

export const iotSimulator = new IoTSimulator();
