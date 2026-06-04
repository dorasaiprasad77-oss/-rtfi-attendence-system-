"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import {
  Radio,
  Cpu,
  Upload,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Loader2,
  X,
  MapPin,
  Key,
  Copy,
} from "lucide-react";

interface SetupStatus {
  hasDevices: boolean;
  hasStudents: boolean;
  hasFaculty: boolean;
  totalDevices: number;
  totalStudents: number;
  totalFaculty: number;
  setupComplete: boolean;
}

interface SetupWizardProps {
  onComplete: () => void;
}

const SETUP_KEY = "rfid_setup_complete";

export function isSetupComplete(): boolean {
  if (typeof window === "undefined") return true; // assume complete on server
  return localStorage.getItem(SETUP_KEY) === "true";
}

export function markSetupComplete() {
  if (typeof window !== "undefined") {
    localStorage.setItem(SETUP_KEY, "true");
  }
}

export function clearSetupFlag() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SETUP_KEY);
  }
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    api
      .get<SetupStatus>("/api/setup/status")
      .then((s) => {
        setStatus(s);
        // Skip steps that are already done
        if (s.hasDevices && s.hasStudents) {
          markSetupComplete();
          onCompleteRef.current();
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const steps = [
    { label: "Welcome", icon: Radio },
    { label: "Register Device", icon: Cpu },
    { label: "Import Students", icon: Users },
    { label: "All Done", icon: CheckCircle2 },
  ];

  const handleComplete = useCallback(() => {
    markSetupComplete();
    onCompleteRef.current();
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f1117]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-white/40">Preparing setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f1117] p-4">
      <div className="w-full max-w-xl">
        {/* Progress bar */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  i <= step
                    ? "bg-brand-500 text-white"
                    : "bg-white/5 text-white/20"
                }`}
              >
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-12 h-0.5 rounded-full transition-all duration-300 ${
                    i < step ? "bg-brand-500" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-2xl shadow-2xl overflow-hidden">
          {step === 0 && (
            <WelcomeStep
              status={status}
              onNext={() => setStep(status?.hasDevices ? 2 : 1)}
              onSkip={handleComplete}
            />
          )}
          {step === 1 && (
            <DeviceStep
              onDone={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <StudentStep
              onDone={() => setStep(3)}
              onBack={() => setStep(status?.hasDevices ? 0 : 1)}
            />
          )}
          {step === 3 && <DoneStep onFinish={handleComplete} />}
        </div>
      </div>
    </div>
  );
}

/* ── Step 0: Welcome ── */
function WelcomeStep({
  status,
  onNext,
  onSkip,
}: {
  status: SetupStatus | null;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center mx-auto mb-5">
        <Radio className="w-7 h-7 text-white" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Welcome to RFID Access</h2>
      <p className="text-sm text-white/40 mb-8 max-w-sm mx-auto">
        Let&apos;s set up your attendance system in just a few steps. You&apos;ll
        register your first RFID reader and import your students.
      </p>

      {/* Current status */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className={`p-3 rounded-xl border ${status?.hasDevices ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/[0.02] border-white/5"}`}>
          <Cpu className={`w-5 h-5 mx-auto mb-1 ${status?.hasDevices ? "text-emerald-400" : "text-white/20"}`} />
          <p className="text-xs font-medium text-white/60">
            {status?.totalDevices || 0} Device{status?.totalDevices !== 1 ? "s" : ""}
          </p>
          <p className="text-[10px] text-white/25">{status?.hasDevices ? "Registered" : "None yet"}</p>
        </div>
        <div className={`p-3 rounded-xl border ${status?.hasStudents ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/[0.02] border-white/5"}`}>
          <Users className={`w-5 h-5 mx-auto mb-1 ${status?.hasStudents ? "text-emerald-400" : "text-white/20"}`} />
          <p className="text-xs font-medium text-white/60">
            {status?.totalStudents || 0} Student{status?.totalStudents !== 1 ? "s" : ""}
          </p>
          <p className="text-[10px] text-white/25">{status?.hasStudents ? "Imported" : "None yet"}</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button onClick={onSkip} className="btn-secondary text-xs px-6">
          Skip for now
        </button>
        <button onClick={onNext} className="btn-primary text-xs px-6">
          Get Started <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </button>
      </div>
    </div>
  );
}

/* ── Step 1: Register Device ── */
function DeviceStep({
  onDone,
  onBack,
}: {
  onDone: () => void;
  onBack: () => void;
}) {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ deviceName: "", location: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadDevices = async () => {
    try {
      const res = await api.get<{ devices: any[] }>("/api/devices");
      setDevices(res.devices);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/api/devices", form);
      setForm({ deviceName: "", location: "" });
      setShowForm(false);
      loadDevices();
    } catch (err: any) {
      setError(err.message || "Failed to register device");
    }
    setSaving(false);
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="p-6">
      <div className="text-center mb-5">
        <Cpu className="w-8 h-8 text-brand-400 mx-auto mb-2" />
        <h3 className="text-lg font-bold text-white">Register Your RFID Reader</h3>
        <p className="text-xs text-white/35 mt-1">
          Connect your ESP32 device so it can communicate with the system
        </p>
      </div>

      {/* Existing devices */}
      {devices.length > 0 && (
        <div className="space-y-2 mb-4">
          {devices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between px-3 py-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">{device.deviceName}</p>
                  <p className="text-[10px] text-white/25 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" />
                    {device.location}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => copyKey(device.apiKey)}
                  className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/50 transition-colors"
                  title="Copy API key"
                >
                  <Key className="w-3 h-3" />
                  {copiedKey === device.apiKey ? (
                    <span className="text-emerald-400">Copied!</span>
                  ) : (
                    <span className="max-w-[80px] truncate">{device.apiKey.slice(0, 8)}...</span>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add device form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full border-2 border-dashed border-white/10 rounded-xl p-4 text-center hover:border-white/20 hover:bg-white/[0.02] transition-all"
        >
          <p className="text-xs text-white/40">+ Register another device</p>
        </button>
      ) : (
        <form onSubmit={handleRegister} className="space-y-3 bg-white/[0.02] border border-white/5 rounded-xl p-4">
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[11px] text-red-400">
              {error}
            </div>
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
              autoFocus
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
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setShowForm(false); setError(""); }} className="btn-secondary text-xs flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary text-xs flex-1">
              {saving ? "Registering..." : "Register"}
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center justify-between mt-6">
        <button onClick={onBack} className="btn-secondary text-xs">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
        </button>
        <button onClick={onDone} className="btn-primary text-xs">
          {devices.length > 0 ? "Continue" : "Skip for now"} <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </button>
      </div>
    </div>
  );
}

/* ── Step 2: Import Students ── */
function StudentStep({
  onDone,
  onBack,
}: {
  onDone: () => void;
  onBack: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.upload<any>("/api/users/import", formData);
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Import failed");
    }
    setUploading(false);
  };

  const downloadTemplate = () => {
    const headers = ["name", "email", "password", "rollNo", "department", "role", "rfidUid"];
    const csv = [
      headers.join(","),
      "Student Name,student@school.edu,,CS001,Computer Science,STUDENT,AA:BB:CC:DD",
      "Another Student,student2@school.edu,,CS002,Mathematics,FACULTY,EE:FF:00:11",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="text-center mb-5">
        <Users className="w-8 h-8 text-brand-400 mx-auto mb-2" />
        <h3 className="text-lg font-bold text-white">Import Students</h3>
        <p className="text-xs text-white/35 mt-1">
          Upload a CSV or Excel file with your student data
        </p>
      </div>

      {!result ? (
        <div className="space-y-3">
          {/* Template link */}
          <button
            onClick={downloadTemplate}
            className="w-full flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/5 rounded-lg hover:bg-white/[0.05] transition-colors text-left"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs text-white/50">Download CSV template</p>
              <p className="text-[10px] text-white/25">Required columns: name, email</p>
            </div>
            <Download className="w-3 h-3 text-white/20 ml-auto" />
          </button>

          {/* File drop */}
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              file
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-white/10 hover:border-white/20"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  setResult(null);
                  setError("");
                }
              }}
              className="hidden"
            />
            {file ? (
              <div>
                <FileSpreadsheet className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                <p className="text-xs text-white font-medium">{file.name}</p>
                <p className="text-[10px] text-white/25">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <Upload className="w-6 h-6 text-white/20 mx-auto mb-1" />
                <p className="text-xs text-white/40">Click to select a file</p>
                <p className="text-[10px] text-white/20">CSV, XLSX, or XLS</p>
              </div>
            )}
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[11px] text-red-400">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-emerald-400">{result.summary.success}</p>
              <p className="text-[10px] text-emerald-400/70">Imported</p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-yellow-400">{result.summary.skipped}</p>
              <p className="text-[10px] text-yellow-400/70">Skipped</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-red-400">{result.summary.failed}</p>
              <p className="text-[10px] text-red-400/70">Failed</p>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1">
              {result.errors.slice(0, 10).map((err: any, i: number) => (
                <p key={i} className="text-[11px] text-red-400/70">
                  Row {err.row}: {err.message}
                </p>
              ))}
            </div>
          )}

          {result.summary.success > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/5 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-emerald-400">
                {result.summary.success} student{result.summary.success !== 1 ? "s" : ""} imported
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <button onClick={onBack} className="btn-secondary text-xs">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
        </button>
        <button onClick={onDone} className="btn-primary text-xs">
          {result?.summary.success > 0 ? "Continue" : "Skip for now"} <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </button>
      </div>
    </div>
  );
}

/* ── Step 3: Done ── */
function DoneStep({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
        <CheckCircle2 className="w-7 h-7 text-emerald-400" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">You&apos;re All Set!</h3>
      <p className="text-xs text-white/40 mb-8 max-w-sm mx-auto">
        Your RFID attendance system is ready. You can always add more devices
        and students from the dashboard.
      </p>

      <div className="space-y-2 text-left max-w-xs mx-auto mb-8">
        {[
          "Register more devices in Devices page",
          "Import students via CSV in Users page",
          "Configure ESP32 with the device API key",
          "Monitor attendance in real-time on the Overview",
        ].map((tip, i) => (
          <div key={i} className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-400 mt-0.5 shrink-0" />
            <p className="text-xs text-white/50">{tip}</p>
          </div>
        ))}
      </div>

      <button onClick={onFinish} className="btn-primary px-8">
        Go to Dashboard
      </button>
    </div>
  );
}
