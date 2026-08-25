import React, { useState } from 'react';
import { 
  Cpu, 
  Download, 
  Copy, 
  Check, 
  Terminal, 
  Send, 
  Layers, 
  BatteryCharging, 
  Wifi, 
  HardDrive, 
  Sparkles,
  ExternalLink,
  Code2
} from 'lucide-react';
import { DeviceLocation, SensorType } from '../types';
import { SENSOR_CONFIGS } from '../utils/sensorConfigs';

interface HardwareFirmwareViewProps {
  device: DeviceLocation;
  onSendRawTelemetryTest: (payload: any) => Promise<void>;
}

export const HardwareFirmwareView: React.FC<HardwareFirmwareViewProps> = ({
  device,
  onSendRawTelemetryTest
}) => {
  const [copiedFirmware, setCopiedFirmware] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [testPayload, setTestPayload] = useState<string>(
    JSON.stringify({
      deviceId: device.id,
      sensors: {
        pH: 7.24,
        turbidity: 1.85,
        temperature: 21.6,
        tds: 280,
        dissolved_oxygen: 7.9
      },
      batteryPercent: 96,
      signalDbm: -62
    }, null, 2)
  );
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleCopyFirmware = () => {
    fetch(`/api/firmware/download?deviceId=${device.id}`)
      .then(res => res.text())
      .then(text => {
        navigator.clipboard.writeText(text);
        setCopiedFirmware(true);
        setTimeout(() => setCopiedFirmware(false), 3000);
      });
  };

  const handleDownloadFirmware = () => {
    window.location.href = `/api/firmware/download?deviceId=${device.id}`;
  };

  const handleSendTestPayload = async () => {
    setIsSending(true);
    try {
      const parsed = JSON.parse(testPayload);
      await onSendRawTelemetryTest(parsed);
      setIngestStatus('Telemetry payload successfully ingested into HydroPulse AI core.');
      setTimeout(() => setIngestStatus(null), 4000);
    } catch (err: any) {
      setIngestStatus(`Failed to send: ${err?.message || 'Invalid JSON format'}`);
    } finally {
      setIsSending(false);
    }
  };

  const curlCommand = `curl -X POST https://${window.location.host}/api/iot/telemetry \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({
    deviceId: device.id,
    sensors: {
      pH: 7.2,
      turbidity: 1.8,
      temperature: 22.0,
      tds: 280,
      dissolved_oxygen: 8.0
    },
    batteryPercent: 98,
    signalDbm: -58
  })}'`;

  return (
    <div id="hardware-firmware-view" className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            ESP32 IoT Hardware Architecture & Firmware Generator
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Production-ready C++ Arduino sketch with Wi-Fi auto-reconnect, SPIFFS offline caching, and REST/MQTT telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="copy-firmware-code-btn"
            onClick={handleCopyFirmware}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            {copiedFirmware ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedFirmware ? 'Copied to Clipboard' : 'Copy Firmware'}</span>
          </button>

          <button
            id="download-ino-sketch-btn"
            onClick={handleDownloadFirmware}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .ino Sketch</span>
          </button>
        </div>
      </div>

      {/* Hardware Pinout & Wiring Matrix */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          Hardware Probe Pinout & GPIO Assignment for {device.name}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {device.sensors.map((st) => {
            const conf = SENSOR_CONFIGS[st];
            if (!conf) return null;

            return (
              <div key={st} className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-200">{conf.name}</span>
                    <span className="font-mono text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/80">
                      {conf.pin}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] mb-2">
                    Type: <span className="text-slate-300 font-semibold">{conf.probeType}</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Range: {conf.minNormal} - {conf.maxNormal} {conf.unit}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Offline Buffering & Power Management Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 font-bold text-indigo-300 text-sm">
            <HardDrive className="w-4 h-4 text-indigo-400" />
            SPIFFS Flash Queue (Offline Buffer)
          </div>
          <p className="text-slate-400 leading-relaxed">
            When Wi-Fi or Cellular network drops, measurements are automatically appended to an internal flash JSON ring buffer (<code className="text-indigo-300">/offline_queue.json</code>) holding up to 5,000 readings.
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 font-bold text-cyan-300 text-sm">
            <Wifi className="w-4 h-4 text-cyan-400" />
            Batch Synchronization Engine
          </div>
          <p className="text-slate-400 leading-relaxed">
            Upon network reconnection, the ESP32 firmware flushes buffered historical records to <code className="text-cyan-300">/api/iot/batch-sync</code> in micro-chunks to prevent server socket timeouts.
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-300 text-sm">
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
            Ultra-Low Power Deep Sleep
          </div>
          <p className="text-slate-400 leading-relaxed">
            For solar and battery-powered field stations, the ESP32 sleeps at ~10µA between sampling cycles, waking periodically via the RTC timer to power sensor rails via MOSFET gate.
          </p>
        </div>
      </div>

      {/* Live Ingestion API Tester & Curl Generator */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            Live IoT Telemetry Ingestion API Tester (POST /api/iot/telemetry)
          </h3>
          <button
            onClick={() => {
              navigator.clipboard.writeText(curlCommand);
              setCopiedCurl(true);
              setTimeout(() => setCopiedCurl(false), 3000);
            }}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
          >
            {copiedCurl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy cURL</span>
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Test ingestion from physical hardware, Python scripts, or Postman. Modify the JSON payload below and click Send:
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* JSON Editor */}
          <div>
            <textarea
              id="raw-telemetry-json-input"
              rows={8}
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              className="w-full bg-slate-950 font-mono text-xs text-cyan-300 p-3.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-inner"
            />
            <div className="mt-2 flex items-center justify-between">
              <button
                id="send-raw-telemetry-btn"
                onClick={handleSendTestPayload}
                disabled={isSending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition disabled:opacity-50 cursor-pointer shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Transmitting...' : 'Send Live Telemetry Packet'}</span>
              </button>
            </div>
          </div>

          {/* cURL Display & Instructions */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 space-y-2 overflow-x-auto">
            <div className="text-slate-500 text-[11px] font-sans font-semibold">Physical Device Ingestion cURL:</div>
            <pre className="text-[11px] text-emerald-400 leading-relaxed whitespace-pre-wrap">
              {curlCommand}
            </pre>
          </div>
        </div>

        {ingestStatus && (
          <div className="mt-3 p-3 rounded-xl bg-cyan-950/40 border border-cyan-800 text-xs text-cyan-300">
            {ingestStatus}
          </div>
        )}
      </div>
    </div>
  );
};
