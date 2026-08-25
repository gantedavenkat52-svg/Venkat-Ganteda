import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine,
  Area,
  AreaChart
} from 'recharts';
import { 
  Calendar, 
  Layers, 
  Maximize2, 
  Filter, 
  TrendingUp, 
  Info,
  CheckSquare,
  Square
} from 'lucide-react';
import { SensorReading, DeviceLocation, SensorType, AnomalyEvent } from '../types';
import { SENSOR_CONFIGS, CONTEXT_THRESHOLDS } from '../utils/sensorConfigs';

interface TelemetryChartsProps {
  device: DeviceLocation;
  history: SensorReading[];
  anomalies: AnomalyEvent[];
  timeframe: string;
  onChangeTimeframe: (tf: string) => void;
  selectedSensor?: SensorType;
}

const SENSOR_CHART_COLORS: Record<SensorType, string> = {
  pH: '#06b6d4',             // Cyan
  turbidity: '#f59e0b',      // Amber
  temperature: '#ef4444',    // Red/Rose
  tds: '#8b5cf6',            // Purple
  conductivity: '#3b82f6',   // Blue
  dissolved_oxygen: '#10b981',// Emerald
  orp: '#ec4899',            // Pink
  water_level: '#0284c7',    // Sky Blue
  chlorine: '#14b8a6',       // Teal
  nitrate: '#f97316'         // Orange
};

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({
  device,
  history,
  anomalies,
  timeframe,
  onChangeTimeframe,
  selectedSensor = 'turbidity'
}) => {
  const [activeSensors, setActiveSensors] = useState<SensorType[]>([
    selectedSensor || 'turbidity',
    'pH',
    'dissolved_oxygen'
  ]);
  const [showThresholds, setShowThresholds] = useState<boolean>(true);
  const [showAnomalies, setShowAnomalies] = useState<boolean>(true);

  // Sync selected sensor from external click if provided
  React.useEffect(() => {
    if (selectedSensor && !activeSensors.includes(selectedSensor)) {
      setActiveSensors(prev => [...prev, selectedSensor]);
    }
  }, [selectedSensor]);

  const toggleSensor = (st: SensorType) => {
    if (activeSensors.includes(st)) {
      if (activeSensors.length > 1) {
        setActiveSensors(activeSensors.filter(s => s !== st));
      }
    } else {
      setActiveSensors([...activeSensors, st]);
    }
  };

  // Format data for Recharts
  const chartData = useMemo(() => {
    return history.map((reading) => {
      const d = new Date(reading.timestamp);
      const timeLabel = timeframe === '1h' 
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : timeframe === '24h'
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`;

      const row: any = {
        timestamp: reading.timestamp,
        timeLabel,
        isOfflineSynced: reading.isOfflineSynced
      };

      // Add each active sensor value
      Object.keys(reading.sensors).forEach((k) => {
        row[k] = reading.sensors[k as SensorType];
      });

      return row;
    });
  }, [history, timeframe]);

  // Primary sensor for Y-Axis reference lines and guidelines
  const primarySensor = activeSensors[0] || 'turbidity';
  const primaryConfig = SENSOR_CONFIGS[primarySensor];
  const primaryLimits = CONTEXT_THRESHOLDS[device.context]?.[primarySensor] || {
    min: primaryConfig?.minNormal ?? 0,
    max: primaryConfig?.maxNormal ?? 10
  };

  return (
    <div id="telemetry-charts-section" className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 mb-8 shadow-xl">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-100">
              Interactive Time-Series Telemetry & Anomaly Inspection
            </h3>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
              {chartData.length} data points
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Continuous multi-sensor recording with synchronized offline batch sync flags and statistical anomaly markers.
          </p>
        </div>

        {/* Timeframe Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: '1h', label: 'Last 1 Hour' },
            { id: '24h', label: 'Last 24 Hours' },
            { id: '7d', label: '7 Days' },
            { id: '30d', label: '30 Days' }
          ].map((tf) => (
            <button
              key={tf.id}
              id={`chart-timeframe-${tf.id}`}
              onClick={() => onChangeTimeframe(tf.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                timeframe === tf.id
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sensor Visibility Toggles */}
      <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-slate-800/80">
        <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Sensors:
        </span>

        {device.sensors.map((st) => {
          const config = SENSOR_CONFIGS[st];
          if (!config) return null;
          const isSelected = activeSensors.includes(st);
          const color = SENSOR_CHART_COLORS[st] || '#38bdf8';

          return (
            <button
              key={st}
              id={`toggle-sensor-chart-${st}`}
              onClick={() => toggleSensor(st)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                isSelected
                  ? 'bg-slate-800 text-slate-200 border-slate-600 shadow-sm'
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-400'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: isSelected ? color : '#475569' }}
              ></span>
              <span>{config.name}</span>
            </button>
          );
        })}

        {/* Threshold and Anomaly Overlays Toggles */}
        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={showThresholds}
              onChange={(e) => setShowThresholds(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Safe Limits</span>
          </label>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="h-80 sm:h-96 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis 
              dataKey="timeLabel" 
              stroke="#64748b" 
              fontSize={11}
              tickLine={false}
              dy={5}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={11}
              tickLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const dataPoint = payload[0].payload;
                  return (
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs text-slate-200 min-w-[200px]">
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
                        <span className="font-semibold text-slate-300 font-mono">{label}</span>
                        {dataPoint.isOfflineSynced && (
                          <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.5 rounded">
                            Offline Synced
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {payload.map((item: any) => {
                          const sensorKey = item.dataKey as SensorType;
                          const conf = SENSOR_CONFIGS[sensorKey];
                          return (
                            <div key={sensorKey} className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-1.5 text-slate-400">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: item.color }}
                                ></span>
                                {conf?.name || sensorKey}:
                              </span>
                              <span className="font-bold text-slate-100 font-mono">
                                {item.value} {conf?.unit || ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Threshold Reference Lines for primary sensor */}
            {showThresholds && primaryConfig && (
              <>
                <ReferenceLine
                  y={primaryLimits.max}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{
                    value: `Max Limit (${primaryLimits.max} ${primaryConfig.unit})`,
                    fill: '#f87171',
                    fontSize: 10,
                    position: 'insideTopRight'
                  }}
                />
                {primaryLimits.min > 0 && (
                  <ReferenceLine
                    y={primaryLimits.min}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{
                      value: `Min Limit (${primaryLimits.min} ${primaryConfig.unit})`,
                      fill: '#f87171',
                      fontSize: 10,
                      position: 'insideBottomRight'
                    }}
                  />
                )}
              </>
            )}

            {/* Render lines for active sensors */}
            {activeSensors.map((st) => {
              const color = SENSOR_CHART_COLORS[st] || '#38bdf8';
              return (
                <Line
                  key={st}
                  type="monotone"
                  dataKey={st}
                  name={SENSOR_CONFIGS[st]?.name || st}
                  stroke={color}
                  strokeWidth={2.5}
                  dot={chartData.length < 30}
                  activeDot={{ r: 6, fill: color, stroke: '#0f172a', strokeWidth: 2 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info Legend */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-red-400 inline-block border-t border-dashed"></span>
            Operational Safety Envelope
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Live High-Frequency Telemetry
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Tip: Click any sensor card above to graph that parameter directly.
        </div>
      </div>
    </div>
  );
};
