"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatDate, formatTime, statusColor, getInitials, formatRelativeTime } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldOff,
  MapPin,
} from "lucide-react";

interface AccessLog {
  id: string;
  entryTime: string;
  exitTime: string | null;
  result: string;
  user: {
    id: string;
    name: string;
    rollNo: string | null;
    department: string | null;
  };
  device: {
    deviceName: string;
    location: string;
  };
}

interface PaginatedLogs {
  logs: AccessLog[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export default function LogsPage() {
  const [data, setData] = useState<PaginatedLogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      const res = await api.get<PaginatedLogs>(`/api/reports/access-logs?${params}`);
      setData(res);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, [page]);

  const grantedCount = data?.logs.filter((l) => l.result === "GRANTED").length || 0;
  const deniedCount = data?.logs.filter((l) => l.result === "DENIED").length || 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Access Logs</h1>
        <p className="text-sm text-white/35 mt-0.5">
          {data?.pagination.total || 0} total entries
        </p>
      </div>

      {/* Summary */}
      <div className="flex gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          Granted: {grantedCount}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20">
          <ShieldOff className="w-3.5 h-3.5" />
          Denied: {deniedCount}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a]/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2d3a]/50">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider hidden md:table-cell">Location</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider">Entry</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider hidden sm:table-cell">Exit</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-white/30 uppercase tracking-wider">Result</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-[#2a2d3a]/30">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="h-5 bg-white/5 rounded animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : data?.logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-xs text-white/20">
                    No access logs found
                  </td>
                </tr>
              ) : (
                data?.logs.map((log) => (
                  <tr key={log.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-brand-600/20 flex items-center justify-center text-[9px] font-bold text-brand-400 shrink-0">
                          {getInitials(log.user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white truncate">{log.user.name}</p>
                          <p className="text-[10px] text-white/20">{log.user.rollNo || log.user.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-xs text-white/40">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{log.device.location}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-white/50">
                        <p>{formatDate(log.entryTime)}</p>
                        <p className="text-[10px] text-white/25">{formatTime(log.entryTime)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {log.exitTime ? (
                        <div className="text-xs text-white/40">
                          <p>{formatDate(log.exitTime)}</p>
                          <p className="text-[10px] text-white/25">{formatTime(log.exitTime)}</p>
                        </div>
                      ) : (
                        <span className="text-[11px] text-white/15">Still inside</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColor(log.result)}`}>
                        {log.result === "GRANTED" ? (
                          <ShieldCheck className="w-3 h-3" />
                        ) : (
                          <ShieldOff className="w-3 h-3" />
                        )}
                        {log.result}
                      </span>
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
