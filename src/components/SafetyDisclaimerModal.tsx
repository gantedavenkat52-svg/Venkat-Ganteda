import React from 'react';
import { 
  ShieldAlert, 
  Info, 
  CheckCircle2, 
  X, 
  Layers, 
  FileCheck, 
  Scale, 
  AlertTriangle
} from 'lucide-react';

interface SafetyDisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SafetyDisclaimerModal: React.FC<SafetyDisclaimerModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              Regulatory Standards & Scientific Calibration Notice
            </h3>
            <p className="text-xs text-slate-400">
              Operational Scope, Limitations of IoT Sensing, and Compliance Envelope.
            </p>
          </div>
        </div>

        {/* Core Disclaimer Content */}
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-4 text-amber-200">
            <h4 className="font-bold flex items-center gap-1.5 text-sm mb-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Continuous Early-Warning vs. Certified Laboratory Testing
            </h4>
            <p>
              HydroPulse AI provides <strong>high-frequency continuous early-warning telemetry</strong>. It is designed to detect sudden environmental anomalies, diurnal trends, process control excursions, and distribution pipeline disruptions.
            </p>
            <p className="mt-2 font-semibold">
              IoT electrochemical and optical sensors do NOT measure biological pathogens (e.g. Total Coliforms, E. coli, Cryptosporidium, Giardia) or trace heavy metal toxins (e.g. Lead, Arsenic, PFAS). Water must never be deemed safe for human consumption solely based on automated AI or sensor scores.
            </p>
          </div>

          {/* Reference Standards Table */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-200 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-cyan-400" />
              International Water Quality Standards Reference
            </h4>

            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between pb-1 border-b border-slate-800">
                <span className="font-semibold text-slate-300">pH Standard (EPA / WHO / ISO 10523):</span>
                <span className="font-mono text-cyan-400">6.5 - 8.5 pH</span>
              </div>
              <div className="flex justify-between pb-1 border-b border-slate-800">
                <span className="font-semibold text-slate-300">Turbidity Standard (EPA Surface Water / ISO 7027):</span>
                <span className="font-mono text-cyan-400">&lt; 1.0 NTU (Target &lt; 0.3 NTU)</span>
              </div>
              <div className="flex justify-between pb-1 border-b border-slate-800">
                <span className="font-semibold text-slate-300">Total Dissolved Solids (EPA Secondary Max):</span>
                <span className="font-mono text-cyan-400">&lt; 500 mg/L (ppm)</span>
              </div>
              <div className="flex justify-between pb-1 border-b border-slate-800">
                <span className="font-semibold text-slate-300">Dissolved Oxygen (Aquatic Habitat Safe):</span>
                <span className="font-mono text-cyan-400">&gt; 6.5 mg/L</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-300">Free Residual Chlorine (WHO Disinfection):</span>
                <span className="font-mono text-cyan-400">0.2 - 2.0 mg/L</span>
              </div>
            </div>
          </div>

          {/* Calibration Drift & Maintenance Protocols */}
          <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 space-y-2">
            <h4 className="font-bold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Sensor Maintenance & Quality Assurance Requirements
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
              <li><strong>pH Glass Electrodes:</strong> Require bi-weekly 2-point NIST buffer calibration (pH 7.00 & 4.01) and storage in 3M KCl solution.</li>
              <li><strong>Optical Turbidity Probes:</strong> Optical lens must be cleaned regularly to prevent biofilm accumulation and biofouling false positives.</li>
              <li><strong>Galvanic DO Sensors:</strong> Electrolyte membrane must be replenished every 3 to 6 months depending on bio-burden.</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition"
          >
            I Acknowledge & Understand
          </button>
        </div>
      </div>
    </div>
  );
};
