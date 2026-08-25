import React from 'react';
import { 
  Droplet, 
  EyeOff, 
  Thermometer, 
  Layers, 
  Zap, 
  Wind, 
  ShieldAlert, 
  Gauge, 
  Sparkles, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { SensorReading, DeviceLocation, SensorType } from '../types';
import { SENSOR_CONFIGS, CONTEXT_THRESHOLDS } from '../utils/sensorConfigs';

interface LiveTelemetryCardsProps {
  device: DeviceLocation;
  latestReading: SensorReading | null;
  history: SensorReading[];
  onSelectSensorForChart?: (sensor: SensorType) => void;
}

const SENSOR_ICONS: Record<string, React.ElementType> = {
  pH: Droplet,
  turbidity: EyeOff,
  temperature: Thermometer,
  tds: Layers,
  conductivity: Zap,
  dissolved_oxygen: Wind,
  orp: ShieldAlert,
  water_level: Gauge,
  chlorine: Sparkles,
  nitrate: AlertCircle
};

export const LiveTelemetryCards: React.FC<LiveTelemetryCardsProps> = ({
  device,
  latestReading,
  history,
  onSelectSensorForChart
}) => {
  const sensorsToDisplay = device.sensors || Object.keys(SENSOR_CONFIGS) as SensorType[];

  return (
    <div id="live-telemetry-grid" className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            Real-Time Multi-Sensor Telemetry
          </h3>
          <p className="text-xs text-slate-400">
            Live calibrated readings with contextual safety envelopes for {device.waterSourceType}.
          </p>
        </div>
        <span className="text-xs text-slate-400 font-mono bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
          {sensorsToDisplay.length} Active Probes
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sensorsToDisplay.map((sensorType) => {
          const config = SENSOR_CONFIGS[sensorType];
          if (!config) return null;

          const IconComponent = SENSOR_ICONS[sensorType] || Droplet;
          const val = latestReading?.sensors?.[sensorType];
          const hasVal = val !== undefined && !isNaN(val);

          // Get context-aware limits
          const ctxLimits = CONTEXT_THRESHOLDS[device.context]?.[sensorType] || {
            min: config.minNormal,
            max: config.maxNormal
          };

          // Determine status
          let status: 'normal' | 'warning' | 'critical' = 'normal';
          if (hasVal) {
            if (val < config.minWarning || val > config.maxWarning) {
              status = 'critical';
            } else if (val < ctxLimits.min || val > ctxLimits.max) {
              status = 'warning';
            }
          }

          // Calculate trend from last 5 readings
          const pastVals = history
            .map(h => h.sensors[sensorType])
            .filter((v): v is number => v !== undefined && !isNaN(v));
          
          let trend: 'up' | 'down' | 'flat' = 'flat';
          if (pastVals.length >= 3) {
            const last = pastVals[pastVals.length - 1];
            const prev = pastVals[pastVals.length - 3];
            const diff = last - prev;
            if (Math.abs(diff) > (config.step * 2)) {
              trend = diff > 0 ? 'up' : 'down';
            }
          }

          // Calculate bar percentage
          const range = config.maxNormal * 1.3 - config.minNormal * 0.7 || 10;
          const pct = hasVal
            ? Math.max(5, Math.min(95, ((val - (config.minNormal * 0.7)) / range) * 100))
            : 50;

          // Status colors
          const colorStyles = {
            normal: {
              cardBorder: 'border-slate-800 hover:border-cyan-500/50',
              badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              valueText: 'text-slate-100',
              barBg: 'bg-emerald-500',
              iconBg: 'bg-slate-800 text-cyan-400'
            },
            warning: {
              cardBorder: 'border-amber-700/60 hover:border-amber-500',
              badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
              valueText: 'text-amber-300',
              barBg: 'bg-amber-500',
              iconBg: 'bg-amber-950 text-amber-400'
            },
            critical: {
              cardBorder: 'border-rose-700/80 hover:border-rose-500',
              badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
              valueText: 'text-rose-400',
              barBg: 'bg-rose-500',
              iconBg: 'bg-rose-950 text-rose-400'
            }
          }[status];

          return (
            <div
              key={sensorType}
              id={`sensor-card-${sensorType}`}
              onClick={() => onSelectSensorForChart && onSelectSensorForChart(sensorType)}
              className={`bg-slate-900/90 rounded-2xl p-4 sm:p-5 border ${colorStyles.cardBorder} shadow-lg hover:shadow-cyan-950/20 transition cursor-pointer flex flex-col justify-between group`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl border border-slate-700/60 ${colorStyles.iconBg} transition-transform group-hover:scale-105`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200 group-hover:text-cyan-300 transition">
                        {config.name}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {config.pin ? config.pin.split(' ')[0] : 'ESP32 ADC'}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colorStyles.badge}`}>
                    {status}
                  </span>
                </div>

                {/* Primary Measurement Value Display */}
                <div className="flex items-baseline justify-between mb-3">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${colorStyles.valueText}`}>
                      {hasVal ? val : '--'}
                    </span>
                    <span className="text-sm font-semibold text-slate-400">
                      {config.unit}
                    </span>
                  </div>

                  {/* Trend Indicator */}
                  <div className="flex items-center gap-1 text-xs font-medium text-slate-400">
                    {trend === 'up' ? (
                      <span className="flex items-center text-amber-400">
                        <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Rising
                      </span>
                    ) : trend === 'down' ? (
                      <span className="flex items-center text-sky-400">
                        <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> Falling
                      </span>
                    ) : (
                      <span className="flex items-center text-slate-500">
                        <Minus className="w-3.5 h-3.5 mr-0.5" /> Steady
                      </span>
                    )}
                  </div>
                </div>

                {/* Mini Visual Gauge Bar */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${colorStyles.barBg} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>

                {/* Range Guidelines */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Min: {ctxLimits.min}</span>
                  <span className="text-slate-500 font-sans text-[10px]">Optimal Range</span>
                  <span>Max: {ctxLimits.max} {config.unit}</span>
                </div>
              </div>

              {/* Card Footer standards hint */}
              <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 line-clamp-1">
                {config.standardsGuide}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
