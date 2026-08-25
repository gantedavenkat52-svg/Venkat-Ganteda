import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { StatusBanner } from './components/StatusBanner';
import { LiveTelemetryCards } from './components/LiveTelemetryCards';
import { TelemetryCharts } from './components/TelemetryCharts';
import { AIPredictionsView } from './components/AIPredictionsView';
import { SmartAlertsView } from './components/SmartAlertsView';
import { HydroAIAssistant } from './components/HydroAIAssistant';
import { LocationMapView } from './components/LocationMapView';
import { SensorHealthView } from './components/SensorHealthView';
import { HardwareFirmwareView } from './components/HardwareFirmwareView';
import { HistoricalReportsView } from './components/HistoricalReportsView';
import { SimulationControlsModal } from './components/SimulationControlsModal';
import { SafetyDisclaimerModal } from './components/SafetyDisclaimerModal';
import { 
  DeviceLocation, 
  SensorReading, 
  WaterQualityAssessment, 
  AlertItem, 
  AnomalyEvent, 
  SensorHealthRecord, 
  CalibrationLog, 
  UserRole, 
  SensorType,
  SimulationScenario
} from './types';

export function App() {
  const [devices, setDevices] = useState<DeviceLocation[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('ESP32-WQM-001');
  const [latestReading, setLatestReading] = useState<SensorReading | null>(null);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [assessment, setAssessment] = useState<WaterQualityAssessment | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [healthRecords, setHealthRecords] = useState<SensorHealthRecord[]>([]);
  const [calibrations, setCalibrations] = useState<CalibrationLog[]>([]);
  
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [role, setRole] = useState<UserRole>('operator');
  const [timeframe, setTimeframe] = useState<string>('24h');
  const [selectedSensorForChart, setSelectedSensorForChart] = useState<SensorType>('turbidity');

  const [isSimModalOpen, setIsSimModalOpen] = useState<boolean>(false);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState<boolean>(false);
  const [isSimRunning, setIsSimRunning] = useState<boolean>(true);
  const [simIntervalMs, setSimIntervalMs] = useState<number>(3000);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);

  // Fetch all devices
  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/devices');
      const data = await res.json();
      if (data.success && data.devices) {
        setDevices(data.devices);
        if (!selectedDeviceId && data.devices.length > 0) {
          setSelectedDeviceId(data.devices[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  }, [selectedDeviceId]);

  // Fetch telemetry for active device
  const fetchTelemetry = useCallback(async () => {
    if (!selectedDeviceId) return;
    try {
      const [latestRes, histRes, alertsRes, anomaliesRes, healthRes, calRes] = await Promise.all([
        fetch(`/api/telemetry/latest?deviceId=${selectedDeviceId}`),
        fetch(`/api/telemetry/history?deviceId=${selectedDeviceId}&timeframe=${timeframe}`),
        fetch(`/api/alerts?deviceId=${selectedDeviceId}`),
        fetch(`/api/anomalies?deviceId=${selectedDeviceId}`),
        fetch(`/api/sensor-health?deviceId=${selectedDeviceId}`),
        fetch(`/api/calibrations?deviceId=${selectedDeviceId}`)
      ]);

      const [latestData, histData, alertsData, anomaliesData, healthData, calData] = await Promise.all([
        latestRes.json(),
        histRes.json(),
        alertsRes.json(),
        anomaliesRes.json(),
        healthRes.json(),
        calRes.json()
      ]);

      if (latestData.success && latestData.latest) {
        setLatestReading(latestData.latest);
      }
      if (histData.success && histData.readings) {
        setHistory(histData.readings);
      }
      if (alertsData.success && alertsData.alerts) {
        setAlerts(alertsData.alerts);
      }
      if (anomaliesData.success && anomaliesData.anomalies) {
        setAnomalies(anomaliesData.anomalies);
      }
      if (healthData.success && healthData.healthRecords) {
        setHealthRecords(healthData.healthRecords);
      }
      if (calData.success && calData.calibrations) {
        setCalibrations(calData.calibrations);
      }
    } catch (err) {
      console.error('Error fetching telemetry bundle:', err);
    }
  }, [selectedDeviceId, timeframe]);

  // Initial load
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Polling loop for live telemetry updates
  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(() => {
      fetchTelemetry();
    }, simIntervalMs);
    return () => clearInterval(interval);
  }, [fetchTelemetry, simIntervalMs]);

  // Trigger Deep AI Analysis
  const handleTriggerDeepAI = async () => {
    if (!selectedDeviceId) return;
    setIsLoadingAI(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: selectedDeviceId })
      });
      const data = await res.json();
      if (data.success && data.assessment) {
        setAssessment(data.assessment);
      }
    } catch (err) {
      console.error('Deep AI analysis failed:', err);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Run AI analysis once on device change or initial load
  useEffect(() => {
    handleTriggerDeepAI();
  }, [selectedDeviceId]);

  // Acknowledge Alert
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const res = await fetch('/api/alerts/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, acknowledgedBy: `${role.toUpperCase()} User` })
      });
      const data = await res.json();
      if (data.success) {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
      }
    } catch (err) {
      console.error('Ack error:', err);
    }
  };

  // Add Device
  const handleAddDevice = async (newDev: Partial<DeviceLocation>) => {
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDev)
      });
      const data = await res.json();
      if (data.success && data.device) {
        setDevices(prev => [...prev, data.device]);
        setSelectedDeviceId(data.device.id);
      }
    } catch (err) {
      console.error('Add device error:', err);
    }
  };

  // Delete Device
  const handleDeleteDevice = async (id: string) => {
    try {
      const res = await fetch(`/api/devices/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDevices(prev => prev.filter(d => d.id !== id));
        if (selectedDeviceId === id) {
          const remaining = devices.filter(d => d.id !== id);
          if (remaining.length > 0) setSelectedDeviceId(remaining[0].id);
        }
      }
    } catch (err) {
      console.error('Delete device error:', err);
    }
  };

  // Save Calibration
  const handleSaveCalibration = async (cal: Partial<CalibrationLog>) => {
    try {
      const res = await fetch('/api/calibrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cal)
      });
      const data = await res.json();
      if (data.success && data.calibration) {
        setCalibrations(prev => [data.calibration, ...prev]);
        fetchTelemetry();
      }
    } catch (err) {
      console.error('Save calibration error:', err);
    }
  };

  // Simulation controls
  const handleToggleSimulation = async (running: boolean, intervalMs?: number) => {
    try {
      const res = await fetch('/api/simulator/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ running, intervalMs })
      });
      const data = await res.json();
      if (data.success) {
        setIsSimRunning(data.running);
        if (data.intervalMs) setSimIntervalMs(data.intervalMs);
      }
    } catch (err) {
      console.error('Toggle sim error:', err);
    }
  };

  const handleTriggerScenario = async (devId: string, scenario: SimulationScenario) => {
    try {
      await fetch('/api/simulator/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: devId, scenario })
      });
      setTimeout(() => {
        fetchTelemetry();
        handleTriggerDeepAI();
      }, 500);
    } catch (err) {
      console.error('Trigger scenario error:', err);
    }
  };

  // Send test telemetry payload
  const handleSendRawTelemetryTest = async (payload: any) => {
    const res = await fetch('/api/iot/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Ingestion error');
    }
    fetchTelemetry();
    handleTriggerDeepAI();
  };

  const currentDevice = devices.find(d => d.id === selectedDeviceId) || devices[0] || {
    id: 'ESP32-WQM-001',
    name: 'Municipal Reservoir Station',
    locationName: 'Sector 4 Water Works',
    waterSourceType: 'Municipal Reservoir',
    context: 'drinking',
    latitude: 37.7749,
    longitude: -122.4194,
    status: 'online',
    batteryPercent: 98,
    signalStrengthDbm: -62,
    firmwareVersion: 'v2.4.1-ota',
    samplingIntervalSec: 15,
    lastSeen: new Date().toISOString(),
    sensors: ['pH', 'turbidity', 'temperature', 'tds', 'dissolved_oxygen', 'chlorine', 'orp', 'water_level'],
    offlineQueueCount: 0,
    calibrationOffsets: {}
  };

  const unreadAlertsCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-cyan-500 selection:text-slate-950 pb-16">
      {/* Top Navbar */}
      <Navbar
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={(id) => setSelectedDeviceId(id)}
        activeTab={activeTab}
        onSelectTab={(t) => setActiveTab(t)}
        role={role}
        onChangeRole={(r) => setRole(r)}
        onOpenSimModal={() => setIsSimModalOpen(true)}
        onOpenDisclaimerModal={() => setIsDisclaimerOpen(true)}
        unreadAlertsCount={unreadAlertsCount}
        isSimRunning={isSimRunning}
        onRefresh={() => {
          setIsLoading(true);
          fetchTelemetry().finally(() => setIsLoading(false));
        }}
        isLoading={isLoading}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Top Status Banner (always visible on Dashboard, AI, Alerts tabs) */}
        {['dashboard', 'ai-analytics', 'alerts'].includes(activeTab) && (
          <StatusBanner
            device={currentDevice}
            latestReading={latestReading}
            assessment={assessment}
            onOpenAIDiagnostics={() => {
              setActiveTab('ai-analytics');
              handleTriggerDeepAI();
            }}
            onOpenAlerts={() => setActiveTab('alerts')}
            activeAlertsCount={unreadAlertsCount}
          />
        )}

        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <div>
            <LiveTelemetryCards
              device={currentDevice}
              latestReading={latestReading}
              history={history}
              onSelectSensorForChart={(s) => setSelectedSensorForChart(s)}
            />
            <TelemetryCharts
              device={currentDevice}
              history={history}
              anomalies={anomalies}
              timeframe={timeframe}
              onChangeTimeframe={(tf) => setTimeframe(tf)}
              selectedSensor={selectedSensorForChart}
            />
          </div>
        )}

        {activeTab === 'ai-analytics' && (
          <AIPredictionsView
            device={currentDevice}
            latestReading={latestReading}
            history={history}
            assessment={assessment}
            anomalies={anomalies}
            onTriggerDeepAnalysis={handleTriggerDeepAI}
            isLoadingAI={isLoadingAI}
          />
        )}

        {activeTab === 'alerts' && (
          <SmartAlertsView
            alerts={alerts}
            device={currentDevice}
            role={role}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            onSendTestNotification={(ch) => {
              console.log('Dispatched simulated notification on channel:', ch);
            }}
          />
        )}

        {activeTab === 'assistant' && (
          <HydroAIAssistant
            device={currentDevice}
            latestReading={latestReading}
            assessment={assessment}
          />
        )}

        {activeTab === 'locations' && (
          <LocationMapView
            devices={devices}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={(id) => {
              setSelectedDeviceId(id);
              setActiveTab('dashboard');
            }}
            onAddDevice={handleAddDevice}
            onDeleteDevice={handleDeleteDevice}
            role={role}
          />
        )}

        {activeTab === 'health' && (
          <SensorHealthView
            device={currentDevice}
            healthRecords={healthRecords}
            calibrations={calibrations}
            onSaveCalibration={handleSaveCalibration}
            role={role}
          />
        )}

        {activeTab === 'hardware' && (
          <HardwareFirmwareView
            device={currentDevice}
            onSendRawTelemetryTest={handleSendRawTelemetryTest}
          />
        )}

        {activeTab === 'reports' && (
          <HistoricalReportsView
            device={currentDevice}
            history={history}
          />
        )}
      </main>

      {/* Simulator Modal */}
      <SimulationControlsModal
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        isSimRunning={isSimRunning}
        simIntervalMs={simIntervalMs}
        onToggleSimulation={handleToggleSimulation}
        onTriggerScenario={handleTriggerScenario}
      />

      {/* Standards & Safety Disclaimer Modal */}
      <SafetyDisclaimerModal
        isOpen={isDisclaimerOpen}
        onClose={() => setIsDisclaimerOpen(false)}
      />
    </div>
  );
}
export default App;
