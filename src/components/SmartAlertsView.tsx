import React, { useState } from 'react';
import { 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Filter, 
  Clock, 
  MapPin, 
  Sliders, 
  ShieldCheck,
  Check,
  RotateCcw
} from 'lucide-react';
import { AlertItem, DeviceLocation, UserRole, AlertSeverity, SensorType } from '../types';
import { SENSOR_CONFIGS } from '../utils/sensorConfigs';

interface SmartAlertsViewProps {
  alerts: AlertItem[];
  device: DeviceLocation;
  role: UserRole;
  onAcknowledgeAlert: (alertId: string) => Promise<void>;
  onSendTestNotification: (channel: 'push' | 'email' | 'sms') => void;
}

export const SmartAlertsView: React.FC<SmartAlertsViewProps> = ({
  alerts,
  device,
  role,
  onAcknowledgeAlert,
  onSendTestNotification
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [showAcknowledged, setShowAcknowledged] = useState<boolean>(true);
  const [notificationTestStatus, setNotificationTestStatus] = useState<string | null>(null);

  const filteredAlerts = alerts.filter(a => {
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    if (!showAcknowledged && a.acknowledged) return false;
    return true;
  });

  const handleTestDispatch = (channel: 'push' | 'email' | 'sms') => {
    onSendTestNotification(channel);
    setNotificationTestStatus(`Simulated ${channel.toUpperCase()} notification sent successfully.`);
    setTimeout(() => setNotificationTestStatus(null), 4000);
  };

  return (
    <div id="smart-alerts-view" className="space-y-6">
      {/* Header & Notification Dispatch Simulator */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Bell className="w-5 h-5 text-cyan-400" />
              Smart Multi-Channel Alert & Notification Center
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
              {alerts.filter(a => !a.acknowledged).length} Unacknowledged
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time threshold monitoring, AI multi-variate anomaly flags, and hardware probe integrity alerts.
          </p>
        </div>

        {/* Multi-Channel Test Triggers */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-medium px-2 flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5" /> Test Dispatch:
          </span>
          <button
            id="test-alert-push-btn"
            onClick={() => handleTestDispatch('push')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700"
          >
            <Bell className="w-3 h-3 text-cyan-400" /> Push
          </button>
          <button
            id="test-alert-email-btn"
            onClick={() => handleTestDispatch('email')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700"
          >
            <Mail className="w-3 h-3 text-indigo-400" /> Email
          </button>
          <button
            id="test-alert-sms-btn"
            onClick={() => handleTestDispatch('sms')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700"
          >
            <MessageSquare className="w-3 h-3 text-emerald-400" /> SMS
          </button>
        </div>
      </div>

      {notificationTestStatus && (
        <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3 text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notificationTestStatus}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 rounded-xl p-3 border border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Severity Filter:
          </span>
          {['all', 'critical', 'warning', 'sensor_fault'].map((sev) => (
            <button
              key={sev}
              id={`filter-alert-sev-${sev}`}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1 rounded-lg font-medium capitalize transition ${
                severityFilter === sev
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev.replace('_', ' ')}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-slate-400 hover:text-slate-200 cursor-pointer">
          <input
            type="checkbox"
            checked={showAcknowledged}
            onChange={(e) => setShowAcknowledged(e.target.checked)}
            className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
          />
          <span>Show Resolved / Acknowledged Alerts</span>
        </label>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-400">
            <CheckCircle2 className="w-12 h-12 text-emerald-500/40 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-200 mb-1">No Active Alerts</h4>
            <p className="text-xs text-slate-500">
              All monitored water parameters are within normal operational limits.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.severity === 'critical';
            const isFault = alert.severity === 'sensor_fault';
            const isWarning = alert.severity === 'warning';

            const severityStyles = isCritical
              ? {
                  border: 'border-rose-800/80 bg-rose-950/20',
                  badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                  icon: AlertOctagon,
                  iconColor: 'text-rose-400'
                }
              : isFault
              ? {
                  border: 'border-purple-800/80 bg-purple-950/20',
                  badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
                  icon: AlertTriangle,
                  iconColor: 'text-purple-400'
                }
              : {
                  border: 'border-amber-800/80 bg-amber-950/20',
                  badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                  icon: AlertTriangle,
                  iconColor: 'text-amber-400'
                };

            const Icon = severityStyles.icon;

            return (
              <div
                key={alert.id}
                id={`alert-card-${alert.id}`}
                className={`rounded-2xl border p-5 transition-all shadow-lg backdrop-blur-sm ${severityStyles.border} ${
                  alert.acknowledged ? 'opacity-70 bg-slate-900/60' : ''
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left: Icon & Alert Title */}
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0 ${severityStyles.iconColor}`}>
                      <Icon className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${severityStyles.badge}`}>
                          {alert.severity.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {alert.id}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {alert.deviceName}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {new Date(alert.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-100">
                        {alert.title}
                      </h3>

                      <p className="text-sm text-slate-300 mt-1">
                        {alert.message}
                      </p>

                      {/* Parameter & Range Metadata Pill Box */}
                      {alert.currentReading !== undefined && (
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 font-mono">
                          <div>
                            <span className="text-slate-400 font-sans">Measured Reading: </span>
                            <span className="font-bold text-slate-100">{alert.currentReading} {alert.unit}</span>
                          </div>
                          <span className="text-slate-600">|</span>
                          <div>
                            <span className="text-slate-400 font-sans">Expected Baseline: </span>
                            <span className="text-slate-300">{alert.expectedRange}</span>
                          </div>
                          <span className="text-slate-600">|</span>
                          <div>
                            <span className="text-slate-400 font-sans">Origin: </span>
                            <span className="text-cyan-400 uppercase text-[10px] font-sans font-bold">{alert.alertType.replace('_', ' ')}</span>
                          </div>
                        </div>
                      )}

                      {/* Recommended Operator Action (Prompt requirement #8) */}
                      <div className="mt-3 text-xs bg-cyan-950/30 border border-cyan-900/40 rounded-xl p-3 text-cyan-200">
                        <span className="font-bold text-cyan-300 uppercase tracking-wide mr-1">
                          Recommended Action:
                        </span>
                        {alert.recommendedAction}
                      </div>
                    </div>
                  </div>

                  {/* Right: Acknowledge Button & Channels */}
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span>Dispatched via:</span>
                      {alert.channelsSent.map((ch) => (
                        <span key={ch} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono uppercase text-[9px]">
                          {ch}
                        </span>
                      ))}
                    </div>

                    {alert.acknowledged ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/30 text-emerald-400 border border-emerald-800/40 text-xs font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        <span>Resolved by {alert.acknowledgedBy || 'Operator'}</span>
                      </div>
                    ) : (
                      <button
                        id={`ack-alert-btn-${alert.id}`}
                        onClick={() => onAcknowledgeAlert(alert.id)}
                        disabled={role === 'viewer'}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shadow-md ${
                          role === 'viewer'
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
                        }`}
                        title={role === 'viewer' ? 'Operators/Admins only' : 'Acknowledge Alert'}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Acknowledge Alert</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
