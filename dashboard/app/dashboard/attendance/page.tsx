"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatDate, formatTime, statusColor, getInitials } from "@/lib/utils";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";

interface AttendanceRecord {
  id: string;
  date: string;
  time: string;
  status: string;
  method: string;
  user: {
    id: string;
    name: string;
    rollNo: string | null;
    department: string | null;
    photoUrl: string | null;
  };
  device: {
    deviceName: string;
    location: string;
  } | null;
}

interface PaginatedAttendance {
  records: AttendanceRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function AttendancePage() {
  const [data, setData] = useState<PaginatedAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");


  const loadAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (statusFilter) params.set("status", statusFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await api.get<PaginatedAttendance>(`/api/attendance?${params}`);
      setData(res);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadAttendance();
  }, [page, statusFilter, startDate, endDate]);

  const handleExport = () => {
    if (!data?.records.length) return;
    const headers = ["Name", "Roll No", "Department", "Date", "Time", "Status", "Device"];
    const rows = data.records.map((r) => [
      r.user.name,
      r.user.rollNo || "",
      r.user.department || "",
      formatDate(r.date),
      formatTime(r.time),
      r.status,
      r.device?.deviceName || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${formatDate(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Summary stats
  const presentCount = data?.records.filter((r) => r.status === "PRESENT").length || 0;
  const lateCount = data?.records.filter((r) => r.status === "LATE").length || 0;
  const absentCount = data?.records.filter((r) => r.status === "ABSENT").length || 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Attendance Records</h1>
          <p className="text-sm text-white/35 mt-0.5">
            {data?.pagination.total || 0} total records
          </p>
        </div>
        <button onClick={handleExport} className="btn-secondary">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Quick Stats */}
      <div className="flex gap-2">
        {[
          { label: "Present", count: presentCount, color: "text-emerald-400 bg-emerald-400/10" },
          { label: "Late", count: lateCount, color: "text-amber-400 bg-amber-400/10" },
          { label: "Absent", count: absentCount, color: "text-red-400 bg-red-400/10" },
        ].map((s) => (
          <div key={s.label} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${s.color}`}>
            {s.label}: {s.count}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="input-field pl-9 text-xs"
            />
          </div>
          <span className="text-white/20 text-xs">to</span>
          <div className="relative flex-1">
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="input-field text-xs"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field w-auto min-w-[130px]"
        >
          <option value="">All Status</option>
          <option value="PRESENT">Present</option>
          <option value="LATE">Late</option>
          <option value="ABSENT">Absent</option>
          <option value="EXCUSED">Excused</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a]/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2d3a]/50">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider">Student</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider hidden md:table-cell">Department</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider hidden sm:table-cell">Time</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider hidden lg:table-cell">Device</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-[#2a2d3a]/30">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-5 bg-white/5 rounded animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : data?.records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-xs text-white/20">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                data?.records.map((rec) => (
                  <tr key={rec.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-brand-600/20 flex items-center justify-center text-[9px] font-bold text-brand-400 shrink-0">
                          {getInitials(rec.user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white truncate">{rec.user.name}</p>
                          <p className="text-[10px] text-white/20">{rec.user.rollNo || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40 hidden md:table-cell">{rec.user.department || "—"}</td>
                    <td className="px-4 py-3 text-xs text-white/50">{formatDate(rec.date)}</td>
                    <td className="px-4 py-3 text-xs text-white/40 hidden sm:table-cell">{formatTime(rec.time)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColor(rec.status)}`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/30 hidden lg:table-cell">
                      {rec.device?.deviceName || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a2d3a]/50">
            <p className="text-[11px] text-white/25">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md hover:bg-white/5 text-white/30 hover:text-white/60 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(data.pagination.totalPages, page + 1))}
                disabled={page === data.pagination.totalPages}
                className="p-1.5 rounded-md hover:bg-white/5 text-white/30 hover:text-white/60 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
