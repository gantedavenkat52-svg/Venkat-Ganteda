import React, { useState } from 'react';
import { 
  Sliders, 
  Play, 
  Pause, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  RotateCcw, 
  CloudOff, 
  Wifi, 
  Flame, 
  Waves, 
  Droplet
} from 'lucide-react';
import { DeviceLocation, SimulationScenario } from '../types';

interface SimulationControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: DeviceLocation[];
  selectedDeviceId: string;
  isSimRunning: boolean;
  simIntervalMs: number;
  onToggleSimulation: (running: boolean, intervalMs?: number) => Promise<void>;
  onTriggerScenario: (deviceId: string, scenario: SimulationScenario) => Promise<void>;
}

export const SimulationControlsModal: React.FC<SimulationControlsModalProps> = ({
  isOpen,
  onClose,
  devices,
  selectedDeviceId,
  isSimRunning,
  simIntervalMs,
  onToggleSimulation,
  onTriggerScenario
}) => {
  const [selectedDevice, setSelectedDevice] = useState(selectedDeviceId);
  const [speed, setSpeed] = useState(simIntervalMs);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleScenarioClick = async (scenario: SimulationScenario, name: string) => {
    try {
      await onTriggerScenario(selectedDevice, scenario);
      setActionNotice(`Injected test event: "${name}"`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggle = async (run: boolean) => {
    await onToggleSimulation(run, speed);
  };

  const handleSpeedChange = async (newSpeed: number) => {
    setSpeed(newSpeed);
    if (isSimRunning) {
      await onToggleSimulation(true, newSpeed);
    }
  };

  const SCENARIOS = [
    {
      id: 'high_turbidity',
      name: 'High Turbidity Storm Runoff',
      description: 'Simulates heavy rainfall sediment influx (Turbidity surges to 16.5 NTU).',
      icon: Waves,
      color: 'border-amber-700/60 bg-amber-950/20 text-amber-300'
    },
    {
      id: 'acidic_surge',
      name: 'Acid Influx Event',
      description: 'Simulates industrial acid spill or runoff (pH plummets to 5.2).',
      icon: Flame,
      color: 'border-rose-700/60 bg-rose-950/20 text-rose-300'
    },
    {
      id: 'alkaline_surge',
      name: 'Alkaline / Lime Spill',
      description: 'Simulates caustic detergent or lime leaching (pH rises to 9.6).',
      icon: Droplet,
      color: 'border-purple-700/60 bg-purple-950/20 text-purple-300'
    },
    {
      id: 'dissolved_oxygen_drop',
      name: 'Biological Hypoxia / DO Depletion',
      description: 'Simulates nocturnal algal bloom respiration (DO drops to 2.4 mg/L).',
      icon: AlertTriangle,
      color: 'border-sky-700/60 bg-sky-950/20 text-sky-300'
    },
    {
      id: 'tds_spike',
      name: 'Mineral Saline Surge',
      description: 'Simulates brackish water or chemical salt discharge (TDS spikes to 1250 ppm).',
      icon: Zap,
      color: 'border-indigo-700/60 bg-indigo-950/20 text-indigo-300'
    },
    {
      id: 'sensor_fault_ph',
      name: 'Hardware Probe Disconnect Fault',
      description: 'Simulates broken electrode or disconnected ADC pin (pH reads 0.0).',
      icon: AlertTriangle,
      color: 'border-red-800/80 bg-red-950/30 text-red-400'
    },
    {
      id: 'offline_sync',
      name: 'Simulate Offline Buffering & Sync',
      description: 'Simulates Wi-Fi blackout with SPIFFS caching, followed by batch sync.',
      icon: CloudOff,
      color: 'border-teal-700/60 bg-teal-950/20 text-teal-300'
    },
    {
      id: 'baseline',
      name: 'Restore Clean Baseline',
      description: 'Resets all parameters back to pristine normal drinking water levels.',
      icon: RotateCcw,
      color: 'border-emerald-700/60 bg-emerald-950/20 text-emerald-300'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              IoT Simulation & Anomaly Test Injector
            </h3>
            <p className="text-xs text-slate-400">
              Control the synthetic IoT telemetry stream and inject real-world water contamination events.
            </p>
          </div>
        </div>

        {actionNotice && (
          <div className="my-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl p-3 text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Stream Controls */}
        <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 my-4 text-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-slate-200 block">Telemetry Stream Engine</span>
              <span className="text-slate-400">
                {isSimRunning ? '🟢 Ingestion active (Generating live readings)' : '⏸️ Ingestion paused'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="toggle-sim-state-btn"
                onClick={() => handleToggle(!isSimRunning)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold transition cursor-pointer shadow-md ${
                  isSimRunning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isSimRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isSimRunning ? 'Pause Stream' : 'Resume Stream'}</span>
              </button>
            </div>
          </div>

          {/* Speed Selector */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <span className="text-slate-400 font-medium">Sampling Rate / Speed:</span>
            <div className="flex items-center gap-1.5">
              {[
                { label: '1s (Hyper)', ms: 1000 },
                { label: '3s (Fast)', ms: 3000 },
                { label: '5s (Normal)', ms: 5000 },
                { label: '10s (Eco)', ms: 10000 }
              ].map((s) => (
                <button
                  key={s.ms}
                  onClick={() => handleSpeedChange(s.ms)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold transition ${
                    speed === s.ms
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Station Selector */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
            <span className="text-slate-400 font-medium">Target Station:</span>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="bg-slate-900 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 font-medium"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Injectable Scenarios Grid */}
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Injectable Test Scenarios & Contamination Events:
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {SCENARIOS.map((sc) => {
            const Icon = sc.icon;
            return (
              <button
                key={sc.id}
                id={`inject-scenario-${sc.id}`}
                onClick={() => handleScenarioClick(sc.id as SimulationScenario, sc.name)}
                className={`p-3.5 rounded-xl border text-left transition-all hover:scale-[1.02] cursor-pointer shadow-md flex items-start gap-3 ${sc.color}`}
              >
                <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">{sc.name}</div>
                  <div className="text-[11px] opacity-80 mt-0.5 leading-relaxed">
                    {sc.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
