"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import {
  Settings,
  Clock,
  Bell,
  Shield,
  Cpu,
  Save,
  Loader2,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

interface SettingsData {
  [key: string]: any;
}

interface SettingsCategories {
  attendance: SettingsData;
  hours: SettingsData;
  device: SettingsData;
  notifications: SettingsData;
}

const FIELD_LABELS: Record<string, string> = {
  late_threshold_minutes: "Late Threshold (minutes)",
  auto_mark_absent_after_minutes: "Auto-mark Absent After (minutes)",
  require_rfid_for_checkin: "Require RFID for Check-in",
  school_start_time: "School Start Time",
  school_end_time: "School End Time",
  work_start_time: "Work Start Time",
  work_end_time: "Work End Time",
  device_offline_threshold_minutes: "Offline Threshold (minutes)",
  device_heartbeat_interval_seconds: "Heartbeat Interval (seconds)",
  notify_on_access_denied: "Alert on Access Denied",
  notify_on_device_offline: "Alert on Device Offline",
  notify_on_late_arrival: "Alert on Late Arrival",
};

const FIELD_DESCRIPTIONS: Record<string, string> = {
  late_threshold_minutes: "Minutes after start time before marking a student as late",
  auto_mark_absent_after_minutes: "Minutes after start time before marking a student as absent",
  require_rfid_for_checkin: "Students must scan RFID to check in (no manual override)",
  school_start_time: "When the school day officially begins",
  school_end_time: "When the school day ends",
  work_start_time: "Office hours start for faculty",
  work_end_time: "Office hours end for faculty",
  device_offline_threshold_minutes: "Minutes without heartbeat before marking a device offline",
  device_heartbeat_interval_seconds: "How often ESP32 devices send heartbeats",
  notify_on_access_denied: "Trigger notifications when an RFID scan is denied",
  notify_on_device_offline: "Trigger notifications when a device goes offline",
  notify_on_late_arrival: "Trigger notifications when a student arrives late",
};

const SECTION_CONFIG = [
  { key: "attendance", label: "Attendance Thresholds", icon: Shield, color: "text-blue-400", bg: "bg-blue-500/10" },
  { key: "hours", label: "Working Hours", icon: Clock, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { key: "device", label: "Device Health", icon: Cpu, color: "text-amber-400", bg: "bg-amber-500/10" },
  { key: "notifications", label: "Notifications", icon: Bell, color: "text-purple-400", bg: "bg-purple-500/10" },
];

export default function SettingsPage() {
  const [categories, setCategories] = useState<SettingsCategories | null>(null);
  const [draft, setDraft] = useState<SettingsData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const originalRef = useRef<SettingsData>({});

  useEffect(() => {
    api
      .get<{ settings: SettingsData; categories: SettingsCategories }>("/api/settings")
      .then((res) => {
        setCategories(res.categories);
        setDraft(res.settings);
        originalRef.current = res.settings;
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: any) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put<{ settings: SettingsData }>("/api/settings", { settings: draft });
      setDraft(res.settings);
      setHasChanges(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const handleReset = () => {
    setDraft({ ...originalRef.current });
    setHasChanges(false);
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-40 rounded-xl bg-[#1a1d27] border border-[#2a2d3a]/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">System Settings</h1>
          <p className="text-sm text-white/35 mt-0.5">
            Configure attendance rules, hours, and preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Saved
            </div>
          )}
          <button
            onClick={handleReset}
            className="btn-secondary text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="btn-primary text-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Settings sections */}
      {SECTION_CONFIG.map((section) => {
        const sectionData = categories?.[section.key as keyof SettingsCategories] || {};
        return (
          <div
            key={section.key}
            className="bg-[#1a1d27] border border-[#2a2d3a]/50 rounded-xl overflow-hidden"
          >
            {/* Section header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[#2a2d3a]/50">
              <div className={`p-2 rounded-lg ${section.bg}`}>
                <section.icon className={`w-4 h-4 ${section.color}`} />
              </div>
              <h2 className="text-sm font-semibold text-white">{section.label}</h2>
            </div>

            {/* Fields */}
            <div className="divide-y divide-[#2a2d3a]/30">
              {Object.entries(sectionData).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.01] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white/70">
                      {FIELD_LABELS[key] || key}
                    </p>
                    <p className="text-[11px] text-white/25 mt-0.5">
                      {FIELD_DESCRIPTIONS[key] || ""}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {typeof draft[key] === "boolean" ? (
                      <button
                        onClick={() => handleChange(key, !draft[key])}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          draft[key] ? "bg-brand-500" : "bg-white/10"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            draft[key] ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    ) : typeof draft[key] === "number" ? (
                      <input
                        type="number"
                        value={draft[key]}
                        onChange={(e) => handleChange(key, parseInt(e.target.value) || 0)}
                        className="input-field w-24 text-xs text-right"
                      />
                    ) : typeof draft[key] === "string" && draft[key]?.includes(":") ? (
                      <input
                        type="time"
                        value={draft[key]}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="input-field w-32 text-xs"
                      />
                    ) : (
                      <input
                        type="text"
                        value={draft[key]}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="input-field w-32 text-xs"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
