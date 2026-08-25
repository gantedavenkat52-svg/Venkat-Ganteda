import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Battery, 
  Wifi, 
  Clock, 
  MapPin, 
  Droplet,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { DeviceLocation, SensorReading, WaterQualityAssessment } from '../types';

interface StatusBannerProps {
  device: DeviceLocation;
  latestReading: SensorReading | null;
  assessment: WaterQualityAssessment | null;
  onOpenAIDiagnostics: () => void;
  onOpenAlerts: () => void;
  activeAlertsCount: number;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  device,
  latestReading,
  assessment,
  onOpenAIDiagnostics,
  onOpenAlerts,
  activeAlertsCount
}) => {
  const score = assessment?.overallScore ?? 88;
  const status = assessment?.status ?? (score >= 80 ? 'optimal' : score >= 65 ? 'warning' : 'critical');
  const riskLevel = assessment?.riskLevel ?? (score >= 80 ? 'Low' : score >= 65 ? 'Moderate' : 'High');
  const trend = assessment?.trend ?? 'Stable';

  // Visual status config
  const statusConfig = {
    optimal: {
      bg: 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      glow: 'shadow-emerald-900/20',
      icon: CheckCircle2,
      label: 'Optimal Water Quality',
      verdict: 'Everything is normal right now. All parameters are within target baseline.'
    },
    acceptable: {
      bg: 'bg-teal-950/40 border-teal-800/60 text-teal-400',
      badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      glow: 'shadow-teal-900/20',
      icon: CheckCircle2,
      label: 'Acceptable Baseline',
      verdict: 'Water parameters are safe and stable with minor seasonal variations.'
    },
    warning: {
      bg: 'bg-amber-950/40 border-amber-800/60 text-amber-400',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      glow: 'shadow-amber-900/20',
      icon: AlertTriangle,
      label: 'Warning: Parameter Deviation',
      verdict: 'Elevated readings detected requiring operator inspection.'
    },
    critical: {
      bg: 'bg-rose-950/40 border-rose-800/60 text-rose-400',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      glow: 'shadow-rose-900/20',
      icon: AlertOctagon,
      label: 'Critical Condition Detected',
      verdict: 'Severe abnormality or potential contamination pattern detected. Immediate attention required.'
    }
  }[status];

  const StatusIcon = statusConfig.icon;

  // Format timestamp
  const timeStr = latestReading?.timestamp
    ? new Date(latestReading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Just now';

  return (
    <div id="status-banner" className={`rounded-2xl border p-5 sm:p-6 mb-6 shadow-xl backdrop-blur-md transition-all ${statusConfig.bg} ${statusConfig.glow}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        {/* Left: Instant Verdict & High-level Status */}
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-inner shrink-0">
            <StatusIcon className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${statusConfig.badgeBg}`}>
                {statusConfig.label}
              </span>
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500" />
                {device.name} ({device.waterSourceType})
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              {assessment?.summary || statusConfig.verdict}
            </h2>

            {/* Subtext info */}
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              {assessment?.aiExplanation || 'Continuous IoT sensor ingestion active with multi-parameter anomaly cross-correlation.'}
            </p>
          </div>
        </div>

        {/* Right: Metrics & Action Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 lg:gap-6 border-t lg:border-t-0 lg:border-l border-slate-800/80 pt-4 lg:pt-0 lg:pl-6">
          {/* Water Quality Index Gauge */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="currentColor"
                  strokeWidth="5"
                  className="text-slate-800"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeDasharray={163.3}
                  strokeDashoffset={163.3 - (163.3 * score) / 100}
                  className={`${
                    score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-rose-500'
                  } transition-all duration-1000 ease-out`}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <span className="absolute text-sm font-extrabold text-slate-100">
                {score}
              </span>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">WQI Score</div>
              <div className="text-sm font-bold text-slate-200">{riskLevel} Risk</div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                {trend === 'Improving' ? (
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                ) : trend === 'Deteriorating' ? (
                  <TrendingDown className="w-3 h-3 text-rose-400" />
                ) : (
                  <Minus className="w-3 h-3 text-slate-400" />
                )}
                <span>{trend} Trend</span>
              </div>
            </div>
          </div>

          {/* Device & Hardware Health Mini Indicators */}
          <div className="bg-slate-900/70 rounded-xl p-3 border border-slate-800/80 text-xs text-slate-300 space-y-1.5 min-w-[130px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Sync:
              </span>
              <span className="font-mono text-slate-200">{timeStr}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 flex items-center gap-1">
                <Battery className="w-3 h-3 text-emerald-400" /> Batt:
              </span>
              <span className="font-semibold text-slate-200">{device.batteryPercent}%</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 flex items-center gap-1">
                <Wifi className="w-3 h-3 text-cyan-400" /> RSSI:
              </span>
              <span className="font-mono text-slate-200">{device.signalStrengthDbm} dBm</span>
            </div>
          </div>

          {/* Quick AI & Alert Actions */}
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <button
              id="banner-ai-diagnostics-btn"
              onClick={onOpenAIDiagnostics}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-600/20 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Deep Analysis</span>
            </button>

            {activeAlertsCount > 0 && (
              <button
                id="banner-view-alerts-btn"
                onClick={onOpenAlerts}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition cursor-pointer"
              >
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>{activeAlertsCount} Active Alert{activeAlertsCount > 1 ? 's' : ''}</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
