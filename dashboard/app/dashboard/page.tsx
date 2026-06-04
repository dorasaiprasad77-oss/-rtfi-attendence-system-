"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { formatDate, formatTime, statusColor, formatRelativeTime, formatDateShort } from "@/lib/utils";
import { useSocket, AttendanceEventData, DeviceEventData, StatsUpdateData } from "@/lib/socket";
import { notifications, areNotificationsEnabled } from "@/lib/notifications";
import { areSoundAlertsEnabled, playDeniedAlert, playGrantedChime, playDeviceOfflineAlert } from "@/lib/alerts";
import {
  Users,
  UserCheck,
  UserX,
  MonitorSmartphone,
  ArrowUpRight,
  Zap,
} from "lucide-react";

interface DashboardData {
  totalUsers: number;
  presentToday: number;
  absentToday: number;
  activeDevices: number;
  totalDevices: number;
  recentActivity: any[];
  attendanceByDepartment: any[];
  weeklyTrend: any[];
  department?: string;
}

export default function OverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveFlash, setLiveFlash] = useState(false);
  const { connected, on } = useSocket();

  useEffect(() => {
    api
      .get<DashboardData>("/api/attendance/dashboard")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Live stats update
  const handleStatsUpdate = useCallback((event: StatsUpdateData) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        presentToday: event.data.presentToday,
        absentToday: event.data.absentToday,
        activeDevices: event.data.activeDevices,
      };
    });
  }, []);

  // Live attendance event + notifications
  const handleAttendance = useCallback((event: AttendanceEventData) => {
    setLiveFlash(true);
    setTimeout(() => setLiveFlash(false), 600);

    // Play audio alert
    if (areSoundAlertsEnabled()) {
      if (event.data.access === "DENIED") {
        playDeniedAlert();
      } else if (event.data.access === "GRANTED") {
        playGrantedChime();
      }
    }

    // Trigger browser notification when tab is not focused
    if (areNotificationsEnabled()) {
      if (event.data.access === "DENIED") {
        notifications.accessDenied(
          event.data.user,
          event.data.device?.location
        );
      } else if (event.data.access === "GRANTED") {
        notifications.attendanceGranted(event.data.user);
      }
    }

    setData((prev) => {
      if (!prev) return prev;

      const newActivity = {
        id: event.data.id,
        user: event.data.user,
        device: event.data.device ? { deviceName: event.data.device.deviceName } : null,
        status: event.data.access === "DENIED" ? "DENIED" : event.data.status,
        time: event.data.id === "denied" ? event.timestamp : event.timestamp,
      };

      const updatedRecent = [newActivity, ...prev.recentActivity].slice(0, 20);

      return {
        ...prev,
        recentActivity: updatedRecent,
      };
    });
  }, []);

  // Live device offline event + audio alert
  const handleDeviceOffline = useCallback((event: DeviceEventData) => {
    if (areSoundAlertsEnabled() && event.data.status === "OFFLINE") {
      playDeviceOfflineAlert();
    }
  }, []);

  useEffect(() => {
    const unsubStats = on("stats:update", handleStatsUpdate);
    const unsubNew = on("attendance:new", handleAttendance);
    const unsubDenied = on("attendance:denied", handleAttendance);
    const unsubOffline = on("device:offline", handleDeviceOffline);
    return () => { unsubStats(); unsubNew(); unsubDenied(); unsubOffline(); };
  }, [on, handleStatsUpdate, handleAttendance, handleDeviceOffline]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-[#1a1d27] border border-[#2a2d3a]/50 animate-pulse" />
          ))}
        </div>
        <div className="h-80 rounded-xl bg-[#1a1d27] border border-[#2a2d3a]/50 animate-pulse" />
      </div>
    );
  }

  const stats = data
    ? [
        {
          label: "Total Students",
          value: data.totalUsers,
          icon: Users,
          color: "text-blue-400",
          bg: "bg-blue-500/10",
          glow: "shadow-blue-500/5",
        },
        {
          label: "Present Today",
          value: data.presentToday,
          icon: UserCheck,
          color: "text-emerald-400",
          bg: "bg-emerald-500/10",
          glow: "shadow-emerald-500/5",
          subtext: data.totalUsers > 0 ? `${Math.round((data.presentToday / data.totalUsers) * 100)}% rate` : "",
        },
        {
          label: "Absent Today",
          value: data.absentToday,
          icon: UserX,
          color: "text-red-400",
          bg: "bg-red-500/10",
          glow: "shadow-red-500/5",
        },
        {
          label: "Active Devices",
          value: `${data.activeDevices}/${data.totalDevices}`,
          icon: MonitorSmartphone,
          color: "text-amber-400",
          bg: "bg-amber-500/10",
          glow: "shadow-amber-500/5",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-white/35 mt-0.5">
            {formatDate(new Date())} &middot; {data?.department ? `${data.department} Department · ` : ""}Real-time attendance overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          {connected && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-400">Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`bg-[#1a1d27] border border-[#2a2d3a]/50 rounded-xl p-4 hover:border-[#2a2d3a] transition-all duration-200 shadow-lg ${s.glow} ${
              liveFlash && s.label === "Present Today" ? "ring-2 ring-emerald-400/30" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 transition-colors duration-300 ${
                  liveFlash && s.label === "Present Today" ? "text-emerald-400" : "text-white"
                }`}>{s.value}</p>
                {s.subtext && (
                  <p className="text-[11px] text-emerald-400/70 mt-0.5">{s.subtext}</p>
                )}
              </div>
              <div className={`p-2.5 rounded-lg ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Weekly Trend */}
        <div className="xl:col-span-2 bg-[#1a1d27] border border-[#2a2d3a]/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Weekly Attendance</h2>
              <p className="text-[11px] text-white/25 mt-0.5">Last 7 days</p>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5 text-white/40">
                <span className="w-2 h-2 rounded-full bg-brand-500" />
                Present
              </span>
              <span className="flex items-center gap-1.5 text-white/40">
                <span className="w-2 h-2 rounded-full bg-white/10" />
                Total
              </span>
            </div>
          </div>

          {data?.weeklyTrend && data.weeklyTrend.length > 0 ? (
            <div className="flex items-end gap-2 h-40">
              {data.weeklyTrend.map((day: any, i: number) => {
                const total = Number(day.count) || 0;
                const present = Number(day.present_count) || 0;
                const maxVal = Math.max(total, 1);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center gap-0.5" style={{ height: "120px" }}>
                      <div className="relative w-full max-w-[40px]">
                        <div
                          className="w-full bg-white/5 rounded-t-md"
                          style={{ height: `${(total / maxVal) * 120}px` }}
                        />
                        <div
                          className="absolute bottom-0 w-full bg-brand-500/60 rounded-t-md"
                          style={{ height: `${(present / maxVal) * 120}px` }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-white/25">
                      {formatDateShort(day.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-xs text-white/20">
              No data available yet
            </div>
          )}
        </div>

        {/* Department breakdown */}
        <div className="bg-[#1a1d27] border border-[#2a2d3a]/50 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">By Department</h2>
          {data?.attendanceByDepartment && data.attendanceByDepartment.length > 0 ? (
            <div className="space-y-3">
              {data.attendanceByDepartment.map((dept: any, i: number) => {
                const pct = data.totalUsers > 0 ? (dept.total / data.totalUsers) * 100 : 0;
                const colors = ["bg-brand-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-pink-500"];
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white/60">{dept.department}</span>
                      <span className="text-[11px] text-white/30">{dept.total} students</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors[i % colors.length]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-xs text-white/20">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[#1a1d27] border border-[#2a2d3a]/50 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
            {connected && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
          </div>
          <a href="/dashboard/attendance" className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
            View all <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>

        {data?.recentActivity && data.recentActivity.length > 0 ? (
          <div className="space-y-0.5">
            {data.recentActivity.slice(0, 8).map((activity: any, i: number) => (
              <div
                key={`${activity.id}-${i}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-all duration-300 ${
                  i === 0 && liveFlash ? "bg-emerald-500/[0.04] animate-[slideIn_0.3s_ease-out]" : ""
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-[10px] font-bold text-brand-400 shrink-0">
                  {activity.user?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">
                    {activity.user?.name || "Unknown"}
                  </p>
                  <p className="text-[11px] text-white/25">
                    {activity.user?.rollNo && <span>{activity.user.rollNo} &middot; </span>}
                    {activity.user?.department || "No department"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColor(activity.status)}`}>
                    {activity.status}
                  </span>
                  <p className="text-[10px] text-white/20 mt-0.5">{formatRelativeTime(activity.time)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-white/20">No activity today yet</div>
        )}
      </div>
    </div>
  );
}
