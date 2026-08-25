import React from 'react';
import { 
  Activity, 
  Wifi, 
  ShieldCheck, 
  AlertTriangle, 
  Cpu, 
  Sliders, 
  Info, 
  UserCheck, 
  RefreshCw,
  Droplets
} from 'lucide-react';
import { DeviceLocation, UserRole, SystemStats } from '../types';

interface NavbarProps {
  devices: DeviceLocation[];
  selectedDeviceId: string;
  onSelectDevice: (id: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  role: UserRole;
  onChangeRole: (role: UserRole) => void;
  onOpenSimModal: () => void;
  onOpenDisclaimerModal: () => void;
  unreadAlertsCount: number;
  isSimRunning: boolean;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  activeTab,
  onSelectTab,
  role,
  onChangeRole,
  onOpenSimModal,
  onOpenDisclaimerModal,
  unreadAlertsCount,
  isSimRunning,
  onRefresh,
  isLoading
}) => {
  const currentDev = devices.find(d => d.id === selectedDeviceId) || devices[0];

  const tabs = [
    { id: 'dashboard', label: 'Live Dashboard', icon: Activity },
    { id: 'ai-analytics', label: 'AI Analytics & Predictions', icon: Cpu, badge: 'AI' },
    { id: 'alerts', label: 'Smart Alerts', icon: AlertTriangle, count: unreadAlertsCount },
    { id: 'assistant', label: 'HydroAI Assistant', icon: Droplets, highlight: true },
    { id: 'locations', label: 'Stations & Map', icon: Wifi },
    { id: 'health', label: 'Sensor Health & Calibration', icon: ShieldCheck },
    { id: 'hardware', label: 'IoT Firmware & Hardware', icon: Sliders },
    { id: 'reports', label: 'Historical Reports', icon: UserCheck }
  ];

  return (
    <header id="app-header" className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 text-slate-100 shadow-md">
      {/* Top Utility Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-bold">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-cyan-400 via-sky-200 to-blue-300 bg-clip-text text-transparent">
                  HydroPulse AI
                </span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  IoT v2.4
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Smart Water Quality Telemetry & AI Early Warning
              </p>
            </div>
          </div>

          {/* Center Station Selector */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                id="station-selector-dropdown"
                value={selectedDeviceId}
                onChange={(e) => onSelectDevice(e.target.value)}
                className="bg-slate-800/90 text-sm text-slate-200 font-medium pl-3 pr-8 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer shadow-inner"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.status === 'online' ? '🟢' : d.status === 'warning' ? '🟡' : '🔴'} {d.name} ({d.context})
                  </option>
                ))}
              </select>
            </div>

            <button
              id="refresh-telemetry-btn"
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh telemetry"
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition border border-slate-700"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>

          {/* Right Actions & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Simulation Controller Button */}
            <button
              id="open-simulation-modal-btn"
              onClick={onOpenSimModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition shadow-sm"
              title="Configure IoT Simulation & Inject Anomaly Events"
            >
              <span className={`w-2 h-2 rounded-full ${isSimRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
              <span className="hidden md:inline">IoT Simulator</span>
            </button>

            {/* Role Switcher */}
            <div className="hidden lg:flex items-center text-xs bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              {(['admin', 'operator', 'viewer'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  id={`role-switch-${r}`}
                  onClick={() => onChangeRole(r)}
                  className={`px-2.5 py-1 rounded capitalize font-medium transition ${
                    role === r
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Safety & Standards Disclaimer Modal Button */}
            <button
              id="open-safety-disclaimer-btn"
              onClick={onOpenDisclaimerModal}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-amber-300 hover:bg-slate-700 transition border border-slate-700"
              title="Calibration & Safety Standards Notice"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="bg-slate-950/80 border-t border-slate-800/80 backdrop-blur-sm overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 py-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-500 text-slate-950">
                    {tab.badge}
                  </span>
                )}
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
