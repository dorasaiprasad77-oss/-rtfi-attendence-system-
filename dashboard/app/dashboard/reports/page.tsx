"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatDate, statusColor, getInitials } from "@/lib/utils";
import {
  Download,
  FileText,
} from "lucide-react";
import { generatePDF } from "@/lib/pdf";

interface ReportData {
  period: { type: string; start: string; end: string };
  summary: {
    totalRecords: number;
    overallAttendanceRate: number;
    byStatus: { present: number; late: number; absent: number; excused: number };
  };
  userStats: {
    user: { id: string; name: string; rollNo: string | null; department: string | null };
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
  }[];
  departmentStats: Record<string, { total: number; present: number; rate: number }>;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly" | "custom">("weekly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: reportType });
      if (reportType === "custom") {
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
      }
      const res = await api.get<ReportData>(`/api/reports?${params}`);
      setData(res);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadReport();
  }, [reportType]);

  const handleExportPDF = () => {
    if (!data?.userStats.length) return;
    const rate = (u: ReportData["userStats"][0]) =>
      u.total > 0 ? Math.round(((u.present + u.late) / u.total) * 100) : 0;
    generatePDF({
      title: "Attendance Report",
      subtitle: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report · Generated ${formatDate(new Date())}`,
      table: {
        head: [["Name", "Roll No", "Department", "Present", "Late", "Absent", "Excused", "Rate %"]],
        body: data.userStats.map((u) => [
          u.user.name,
          u.user.rollNo || "—",
          u.user.department || "—",
          u.present,
          u.late,
          u.absent,
          u.excused,
          `${rate(u)}%`,
        ]),
      },
      fileName: `report-${reportType}-${formatDate(new Date())}.pdf`,
    });
  };

  const handleExport = () => {
    if (!data?.userStats.length) return;
    const headers = ["Name", "Roll No", "Department", "Present", "Late", "Absent", "Excused", "Total", "Rate %"];
    const rows = data.userStats.map((u) => [
      u.user.name,
      u.user.rollNo || "",
      u.user.department || "",
      u.present,
      u.late,
      u.absent,
      u.excused,
      u.total,
      u.total > 0 ? Math.round(((u.present + u.late) / u.total) * 100) : 0,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${reportType}-${formatDate(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Reports</h1>
          <p className="text-sm text-white/35 mt-0.5">Attendance analytics and summary</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary">
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button onClick={handleExportPDF} className="btn-secondary">
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Type Selector */}
      <div className="flex gap-2">
        {(["daily", "weekly", "monthly", "custom"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setReportType(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              reportType === type
                ? "bg-brand-600 text-white"
                : "bg-[#1e2130] text-white/40 hover:text-white/60 border border-[#2a2d3a]"
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {reportType === "custom" && (
        <div className="flex gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input-field text-xs max-w-[200px]"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input-field text-xs max-w-[200px]"
          />
          <button onClick={loadReport} className="btn-primary text-xs">
            Generate
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-[#1a1d27] border border-[#2a2d3a]/50 animate-pulse" />
            ))}
          </div>
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#1a1d27] border border-[#2a2d3a]/50 rounded-xl p-4">
              <p className="text-[10px] font-medium text-white/25 uppercase tracking-wider">Attendance Rate</p>
              <p className="text-2xl font-bold text-white mt-1">{data.summary.overallAttendanceRate}%</p>
              <div className="mt-2 w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full" style={{ width: `${data.summary.overallAttendanceRate}%` }} />
              </div>
            </div>
            <div className="bg-[#1a1d27] border border-[#2a2d3a]/50 rounded-xl p-4">
              <p className="text-[10px] font-medium text-white/25 uppercase tracking-wider">Total Records</p>
              <p className="text-2xl font-bold text-white mt-1">{data.summary.totalRecords}</p>
            </div>
            <div className="bg-[#1a1d27] border border-[#2a2d3a]/50 rounded-xl p-4">
              <p className="text-[10px] font-medium text-white/25 uppercase tracking-wider">Present / Late</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{data.summary.byStatus.present}</p>
              <p className="text-xs text-amber-400">{data.summary.byStatus.late} late</p>
            </div>
            <div className="bg-[#1a1d27] border border-[#2a2d3a]/50 rounded-xl p-4">
              <p className="text-[10px] font-medium text-white/25 uppercase tracking-wider">Absent / Excused</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{data.summary.byStatus.absent}</p>
              <p className="text-xs text-blue-400">{data.summary.byStatus.excused} excused</p>
            </div>
          </div>

          {/* Department Stats */}
          {Object.keys(data.departmentStats).length > 0 && (
            <div className="bg-[#1a1d27] border border-[#2a2d3a]/50 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Department Breakdown</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(data.departmentStats).map(([dept, stats]) => (
                  <div key={dept} className="bg-[#0f1117] rounded-lg p-3 border border-[#2a2d3a]/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-white/60">{dept}</span>
                      <span className="text-[11px] font-semibold text-brand-400">{stats.rate}%</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500/60 rounded-full" style={{ width: `${stats.rate}%` }} />
                    </div>
                    <p className="text-[10px] text-white/20 mt-1.5">{stats.present}/{stats.total} records</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Stats Table */}
          <div className="bg-[#1a1d27] border border-[#2a2d3a]/50 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#2a2d3a]/50">
              <h2 className="text-sm font-semibold text-white">Individual Performance</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2d3a]/50">
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Student</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Present</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Late</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Absent</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-white/25 uppercase tracking-wider">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.userStats.map((stat) => {
                    const rate = stat.total > 0 ? Math.round(((stat.present + stat.late) / stat.total) * 100) : 0;
                    return (
                      <tr key={stat.user.id} className="table-row">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-brand-600/20 flex items-center justify-center text-[8px] font-bold text-brand-400">
                              {getInitials(stat.user.name)}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-white">{stat.user.name}</p>
                              <p className="text-[10px] text-white/20">{stat.user.rollNo || stat.user.department}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs text-emerald-400">{stat.present}</td>
                        <td className="px-3 py-2.5 text-center text-xs text-amber-400">{stat.late}</td>
                        <td className="px-3 py-2.5 text-center text-xs text-red-400">{stat.absent}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-xs font-semibold ${rate >= 80 ? "text-emerald-400" : rate >= 60 ? "text-amber-400" : "text-red-400"}`}>
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="py-16 text-center text-xs text-white/20">No report data available</div>
      )}
    </div>
  );
}
