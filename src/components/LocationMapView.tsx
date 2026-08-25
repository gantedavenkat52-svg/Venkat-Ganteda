import React, { useState } from 'react';
import { 
  MapPin, 
  Wifi, 
  Battery, 
  Plus, 
  Activity, 
  Clock, 
  Trash2, 
  ExternalLink, 
  ShieldCheck,
  AlertTriangle,
  Radio,
  Sliders,
  CheckCircle2,
  X
} from 'lucide-react';
import { DeviceLocation, UserRole, SensorType, WaterContext } from '../types';
import { SENSOR_CONFIGS } from '../utils/sensorConfigs';

interface LocationMapViewProps {
  devices: DeviceLocation[];
  selectedDeviceId: string;
  onSelectDevice: (id: string) => void;
  onAddDevice: (newDevice: Partial<DeviceLocation>) => Promise<void>;
  onDeleteDevice: (id: string) => Promise<void>;
  role: UserRole;
}

export const LocationMapView: React.FC<LocationMapViewProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  onAddDevice,
  onDeleteDevice,
  role
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formWaterType, setFormWaterType] = useState('Municipal Reservoir');
  const [formContext, setFormContext] = useState<WaterContext>('drinking');
  const [formLat, setFormLat] = useState('37.7749');
  const [formLng, setFormLng] = useState('-122.4194');
  const [formInterval, setFormInterval] = useState('15');
  const [formSensors, setFormSensors] = useState<SensorType[]>([
    'pH', 'turbidity', 'temperature', 'tds', 'dissolved_oxygen'
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleFormSensor = (st: SensorType) => {
    if (formSensors.includes(st)) {
      if (formSensors.length > 1) {
        setFormSensors(formSensors.filter(s => s !== st));
      }
    } else {
      setFormSensors([...formSensors, st]);
    }
  };

  const handleSubmitNewDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formLocation) return;
    setIsSubmitting(true);
    try {
      await onAddDevice({
        name: formName,
        locationName: formLocation,
        waterSourceType: formWaterType,
        context: formContext,
        latitude: parseFloat(formLat) || 37.7749,
        longitude: parseFloat(formLng) || -122.4194,
        samplingIntervalSec: parseInt(formInterval) || 15,
        sensors: formSensors
      });
      setIsAddModalOpen(false);
      setFormName('');
      setFormLocation('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="location-map-view" className="space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            Distributed IoT Monitoring Stations & Geographical Mesh
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Georeferenced IoT sensor nodes with autonomous telemetry transmission and status telemetry.
          </p>
        </div>

        {role === 'admin' && (
          <button
            id="open-add-station-modal-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/20 transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Deploy New Station</span>
          </button>
        )}
      </div>

      {/* Interactive Map Visualizer Canvas */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 relative overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Geographic Station Map Visualizer
          </span>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Normal</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Warning</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Critical</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span> Offline</span>
          </div>
        </div>

        {/* Stylized Vector Map Grid */}
        <div className="relative h-72 sm:h-96 w-full rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden flex items-center justify-center">
          {/* Subtle Grid Lines */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>

          {/* Coordinate Water Topology Overlay */}
          <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 0,150 Q 200,80 400,200 T 800,180 T 1200,250" fill="none" stroke="#06b6d4" strokeWidth="4" />
            <path d="M 0,220 Q 300,180 600,260 T 1200,200" fill="none" stroke="#3b82f6" strokeWidth="3" />
            <circle cx="280" cy="120" r="40" fill="#0284c7" opacity="0.3" />
            <circle cx="750" cy="220" r="60" fill="#0ea5e9" opacity="0.2" />
          </svg>

          {/* Render Station Pins on Stylized Map */}
          {devices.map((d, index) => {
            const isSelected = d.id === selectedDeviceId;
            const statusColor = d.status === 'online' ? 'bg-emerald-400 shadow-emerald-500/50' : d.status === 'warning' ? 'bg-amber-400 shadow-amber-500/50' : d.status === 'critical' ? 'bg-rose-500 shadow-rose-500/50' : 'bg-slate-500';

            // Map layout positions
            const positions = [
              { top: '30%', left: '25%' },
              { top: '22%', left: '60%' },
              { top: '65%', left: '35%' },
              { top: '70%', left: '72%' },
              { top: '45%', left: '48%' },
              { top: '55%', left: '80%' }
            ];
            const pos = positions[index % positions.length];

            return (
              <div
                key={d.id}
                id={`map-pin-${d.id}`}
                onClick={() => onSelectDevice(d.id)}
                style={{ top: pos.top, left: pos.left }}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20`}
              >
                <div className="relative flex flex-col items-center">
                  {/* Ping Animation Ring */}
                  {d.status !== 'offline' && (
                    <div className={`absolute -inset-2 rounded-full ${statusColor} opacity-30 animate-ping`}></div>
                  )}

                  {/* Marker Pin Icon */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-125 border ${
                    isSelected ? 'bg-slate-900 border-cyan-400 ring-2 ring-cyan-500 scale-110' : 'bg-slate-900 border-slate-700'
                  }`}>
                    <span className={`w-3 h-3 rounded-full ${statusColor}`}></span>
                  </div>

                  {/* Pin Tooltip Card */}
                  <div className="absolute top-10 whitespace-nowrap bg-slate-950/95 border border-slate-800 text-slate-200 px-3 py-1.5 rounded-xl shadow-2xl text-[11px] opacity-90 group-hover:opacity-100 transition">
                    <div className="font-bold text-slate-100">{d.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Lat: {d.latitude.toFixed(4)}, Lng: {d.longitude.toFixed(4)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Station Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((dev) => {
          const isSelected = dev.id === selectedDeviceId;
          const statusBadge = dev.status === 'online'
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : dev.status === 'warning'
            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            : 'bg-rose-500/10 text-rose-300 border-rose-500/30';

          return (
            <div
              key={dev.id}
              id={`station-card-${dev.id}`}
              onClick={() => onSelectDevice(dev.id)}
              className={`bg-slate-900/90 rounded-2xl border p-5 transition-all shadow-lg cursor-pointer flex flex-col justify-between ${
                isSelected ? 'border-cyan-500 ring-1 ring-cyan-500/50 bg-slate-900' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      {dev.id}
                    </span>
                    <h3 className="text-base font-bold text-slate-100">
                      {dev.name}
                    </h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusBadge}`}>
                    {dev.status}
                  </span>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-1 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {dev.locationName} ({dev.waterSourceType})
                </div>

                {/* Specs List */}
                <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1"><Battery className="w-3.5 h-3.5 text-emerald-400" /> Battery:</span>
                    <span className="font-semibold">{dev.batteryPercent}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1"><Wifi className="w-3.5 h-3.5 text-cyan-400" /> Signal RSSI:</span>
                    <span className="font-mono">{dev.signalStrengthDbm} dBm</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Sampling:</span>
                    <span className="font-mono">Every {dev.samplingIntervalSec}s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1"><Sliders className="w-3.5 h-3.5" /> Firmware:</span>
                    <span className="font-mono">{dev.firmwareVersion}</span>
                  </div>
                </div>

                {/* Sensor Probes Chips */}
                <div className="flex flex-wrap gap-1">
                  {dev.sensors.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-cyan-400 font-medium">
                  {isSelected ? '✓ Currently Selected' : 'Click to View Telemetry'}
                </span>

                {role === 'admin' && devices.length > 1 && (
                  <button
                    id={`delete-station-btn-${dev.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Remove station "${dev.name}"?`)) {
                        onDeleteDevice(dev.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition"
                    title="Remove Station"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deploy New Station Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-slate-100 mb-1">
              Deploy New IoT Monitoring Station
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Register a new ESP32 / Arduino-compatible sensing node in the central mesh.
            </p>

            <form onSubmit={handleSubmitNewDevice} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Station Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Westside Treatment Inflow Tank"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 px-3.5 py-2 rounded-xl border border-slate-700 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Location / Facility Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Municipal Reservoir Gate 4"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 px-3.5 py-2 rounded-xl border border-slate-700 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Water Context</label>
                  <select
                    value={formContext}
                    onChange={(e) => setFormContext(e.target.value as WaterContext)}
                    className="w-full bg-slate-950 text-slate-100 px-3 py-2 rounded-xl border border-slate-700"
                  >
                    <option value="drinking">Drinking Water (Potable)</option>
                    <option value="aquaculture">Aquaculture / Fish Pond</option>
                    <option value="agriculture">Agricultural Irrigation</option>
                    <option value="industrial">Industrial Intake/Effluent</option>
                    <option value="recreational">Recreational Swimming/Lake</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Sampling Interval (sec)</label>
                  <input
                    type="number"
                    min="5"
                    max="3600"
                    value={formInterval}
                    onChange={(e) => setFormInterval(e.target.value)}
                    className="w-full bg-slate-950 text-slate-100 px-3 py-2 rounded-xl border border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Latitude</label>
                  <input
                    type="text"
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    className="w-full bg-slate-950 text-slate-100 px-3 py-2 rounded-xl border border-slate-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Longitude</label>
                  <input
                    type="text"
                    value={formLng}
                    onChange={(e) => setFormLng(e.target.value)}
                    className="w-full bg-slate-950 text-slate-100 px-3 py-2 rounded-xl border border-slate-700 font-mono"
                  />
                </div>
              </div>

              {/* Sensor Selection */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Attached Hardware Sensors:</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(SENSOR_CONFIGS) as SensorType[]).map((st) => (
                    <label
                      key={st}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer text-slate-300 hover:text-slate-100"
                    >
                      <input
                        type="checkbox"
                        checked={formSensors.includes(st)}
                        onChange={() => handleToggleFormSensor(st)}
                        className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                      />
                      <span>{SENSOR_CONFIGS[st]?.name || st}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Confirm Deployment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
