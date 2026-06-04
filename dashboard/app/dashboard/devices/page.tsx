"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatRelativeTime, statusColor } from "@/lib/utils";
import {
  Plus,
  Wifi,
  WifiOff,
  Wrench,
  MapPin,
  Clock,
  Trash2,
  X,
  Cpu,
  Key,
  Copy,
  Check,
} from "lucide-react";

interface Device {
  id: string;
  deviceName: string;
  location: string;
  status: string;
  apiKey: string;
  lastSeen: string | null;
  createdAt: string;
  _count: { attendance: number; accessLogs: number };
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ devices: Device[] }>("/api/devices");
      setDevices(res.devices);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this device? It will no longer be usable.")) return;
    try {
      await api.delete(`/api/devices/${id}`);
      loadDevices();
    } catch {}
  };

  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "ONLINE": return <Wifi className="w-3.5 h-3.5" />;
      case "OFFLINE": return <WifiOff className="w-3.5 h-3.5" />;
      case "MAINTENANCE": return <Wrench className="w-3.5 h-3.5" />;
      default: return <Cpu className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Devices</h1>
          <p className="text-sm text-white/35 mt-0.5">{devices.length} registered devices</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Register Device
        </button>
      </div>

      {/* Device Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-52 rounded-xl bg-[#1a1d27] border border-[#2a2d3a]/50 animate-pulse" />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="bg-[#1a1d27] border border-[#2a2d3a]/50 rounded-xl py-16 text-center">
          <Cpu className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30">No devices registered</p>
          <p className="text-xs text-white/15 mt-1">Register your first RFID reader to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {devices.map((device) => (
            <div key={device.id} className="bg-[#1a1d27] border border-[#2a2d3a]/50 rounded-xl p-5 hover:border-[#2a2d3a] transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${
                    device.status === "ONLINE"
                      ? "bg-emerald-500/10"
                      : device.status === "MAINTENANCE"
                      ? "bg-amber-500/10"
                      : "bg-white/5"
                  }`}>
                    <span className={device.status === "ONLINE" ? "text-emerald-400" : device.status === "MAINTENANCE" ? "text-amber-400" : "text-white/30"}>
                      {statusIcon(device.status)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{device.deviceName}</h3>
                    <p className="text-[11px] text-white/30 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {device.location}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColor(device.status)}`}>
                  {device.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/25">Last seen</span>
                  <span className="text-white/40 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {device.lastSeen ? formatRelativeTime(device.lastSeen) : "Never"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/25">Scans recorded</span>
                  <span className="text-white/40">{device._count.attendance}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/25">Access logs</span>
                  <span className="text-white/40">{device._count.accessLogs}</span>
                </div>
              </div>

              {/* API Key */}
              <div className="bg-[#0f1117] rounded-lg px-3 py-2 mb-4 border border-[#2a2d3a]/30">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/20 truncate max-w-[180px]">{device.apiKey}</span>
                  <button
                    onClick={() => copyApiKey(device.apiKey)}
                    className="p-1 rounded hover:bg-white/5 text-white/20 hover:text-white/50 transition-colors"
                  >
                    {copiedKey === device.apiKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDelete(device.id)}
                  className="flex-1 btn-danger text-[11px] py-1.5"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Device Modal */}
      {showAddModal && (
        <AddDeviceModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); loadDevices(); }}
        />
      )}
    </div>
  );
}

function AddDeviceModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ deviceName: "", location: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/api/devices", form);
      onSaved();
    } catch (err: any) {
      setError(err.message || "Failed to register device");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#1a1d27] border border-[#2a2d3a] rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3a]/50">
          <h3 className="text-sm font-semibold text-white">Register New Device</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/5 text-white/30 hover:text-white/60">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">{error}</div>
          )}
          <div>
            <label className="block text-[11px] font-medium text-white/40 mb-1">Device Name</label>
            <input
              type="text"
              value={form.deviceName}
              onChange={(e) => setForm({ ...form, deviceName: e.target.value })}
              required
              className="input-field"
              placeholder="e.g. Main Gate Reader"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-white/40 mb-1">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              required
              className="input-field"
              placeholder="e.g. Building A - Main Entrance"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary text-xs">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary text-xs">
              {loading ? "Registering..." : "Register Device"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
