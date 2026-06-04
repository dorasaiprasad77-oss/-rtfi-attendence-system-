"use client";

import { useState, useRef } from "react";
import { api } from "@/lib/api";
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
} from "lucide-react";

interface ImportError {
  row: number;
  message: string;
}

interface ImportResult {
  message: string;
  summary: {
    total: number;
    success: number;
    skipped: number;
    failed: number;
  };
  errors?: ImportError[];
}

interface ImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

export default function ImportModal({ onClose, onImported }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);
    setError("");

    // Parse preview (only for CSV files — Excel binary can't be read as text)
    if (selectedFile.name.endsWith(".csv")) {
      try {
        const text = await selectedFile.text();
        const lines = text.split("\n").slice(0, 6); // Preview first 5 rows
        const rows = lines
          .map((line) => line.split(",").map((cell) => cell.trim()))
          .filter((row) => row.some((cell) => cell.length > 0));
        setPreview(rows);
      } catch {
        setPreview([]);
      }
    } else {
      setPreview([]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.upload<ImportResult>("/api/users/import", formData);
      setResult(res);
      if (res.summary.success > 0) {
        onImported();
      }
    } catch (err: any) {
      setError(err.message || "Import failed");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ["name", "email", "password", "rollNo", "department", "role", "rfidUid"];
    const example = [
      "Student Name,student@school.edu,,CS001,Computer Science,STUDENT,AA:BB:CC:DD",
      "Faculty Name,faculty@school.edu,,CS002,Mathematics,FACULTY,EE:FF:00:11",
    ];
    const csv = [headers.join(","), ...example].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "user-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#1a1d27] border border-[#2a2d3a] rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3a]/50">
          <div>
            <h3 className="text-sm font-semibold text-white">Import Users</h3>
            <p className="text-[11px] text-white/30 mt-0.5">
              Upload CSV or Excel file with student data
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/5 text-white/30 hover:text-white/60">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Template download */}
          <div className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg border border-white/5">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-white/50">Need a template?</span>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Download className="w-3 h-3" />
              Download CSV
            </button>
          </div>

          {/* File upload area */}
          {!result && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                file
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              {file ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-sm text-white font-medium">{file.name}</p>
                  <p className="text-[11px] text-white/30">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-white/20 mx-auto" />
                  <p className="text-sm text-white/50">
                    Drop your file here or click to browse
                  </p>
                  <p className="text-[11px] text-white/20">
                    Supports CSV, XLSX, XLS (max 5MB)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && !result && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider">
                Preview (first {preview.length - 1} rows)
              </p>
              <div className="overflow-x-auto bg-white/[0.02] rounded-lg border border-white/5">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-white/5">
                      {preview[0]?.map((header, i) => (
                        <th key={i} className="px-3 py-2 text-left text-white/40 font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(1).map((row, i) => (
                      <tr key={i} className="border-b border-white/5 last:border-0">
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 text-white/50">
                            {cell || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3">
              {/* Summary cards */}
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

              {/* Errors list */}
              {result.errors && result.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  <p className="text-[11px] font-medium text-white/40">Errors:</p>
                  {result.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-2 bg-red-500/5 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[11px] font-medium text-red-400">Row {err.row}: </span>
                        <span className="text-[11px] text-white/40">{err.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result.summary.success > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/5 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400">
                    {result.summary.success} user{result.summary.success !== 1 ? "s" : ""} imported successfully
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#2a2d3a]/50">
          <button onClick={onClose} className="btn-secondary text-xs">
            {result ? "Close" : "Cancel"}
          </button>
          {!result && (
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="btn-primary text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Importing...
                </span>
              ) : (
                "Import Users"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
