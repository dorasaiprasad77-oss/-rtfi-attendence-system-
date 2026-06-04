"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { useSocket } from "@/lib/socket";
import SetupWizard, { isSetupComplete } from "./setup-wizard";
import {
  registerServiceWorker,
  requestNotificationPermission,
  getNotificationPermission,
  areNotificationsEnabled,
  setNotificationsEnabled,
} from "@/lib/notifications";
import {
  areSoundAlertsEnabled,
  setSoundAlertsEnabled,
  unlockAudio,
} from "@/lib/alerts";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  FileBarChart,
  Cpu,
  ScrollText,
  LogOut,
  Menu,
  ChevronDown,
  Radio,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, roles: ["ADMIN", "FACULTY"] },
  { href: "/dashboard/users", label: "Users", icon: Users, roles: ["ADMIN"] },
  { href: "/dashboard/attendance", label: "Attendance", icon: ClipboardCheck, roles: ["ADMIN", "FACULTY"] },
  { href: "/dashboard/reports", label: "Reports", icon: FileBarChart, roles: ["ADMIN", "FACULTY"] },
  { href: "/dashboard/devices", label: "Devices", icon: Cpu, roles: ["ADMIN"] },
  { href: "/dashboard/logs", label: "Access Logs", icon: ScrollText, roles: ["ADMIN", "FACULTY"] },
];

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [soundOn, setSoundOn] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const { connected: wsConnected } = useSocket();

  // Initialize notification state and register SW
  useEffect(() => {
    setNotificationsOn(areNotificationsEnabled());
    setNotifPermission(getNotificationPermission());
    setSoundOn(areSoundAlertsEnabled());
    registerServiceWorker();
  }, []);

  // Show setup wizard on first admin login
  useEffect(() => {
    if (user && user.role === "ADMIN" && !isSetupComplete()) {
      setShowSetup(true);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-white/40">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const filteredNav = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-[#0f1117] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-[#1a1d27] border-r border-[#2a2d3a] flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#2a2d3a]/50">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">RFID Access</h1>
              <p className="text-[10px] text-white/30 font-medium tracking-wider uppercase">Control System</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-semibold text-white/25 uppercase tracking-widest">Navigation</p>
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`sidebar-item ${isActive ? "active" : "text-white/50"}`}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                <span>{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        <div className="px-3 py-3 border-t border-[#2a2d3a]/50">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-white/30 truncate">{user.role}</p>
            </div>
            <button
              onClick={() => { logout(); router.replace("/login"); }}
              className="p-1.5 rounded-md hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 bg-[#0f1117]/80 backdrop-blur-xl border-b border-[#2a2d3a]/50 flex items-center px-4 lg:px-6 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-white/50"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {/* Sound alert toggle */}
            <button
              onClick={() => {
                unlockAudio();
                const next = !soundOn;
                setSoundOn(next);
                setSoundAlertsEnabled(next);
              }}
              className={`p-2 rounded-lg transition-colors ${
                soundOn
                  ? "text-amber-400 hover:bg-amber-500/10"
                  : "text-white/30 hover:bg-white/5 hover:text-white/50"
              }`}
              title={soundOn ? "Sound alerts on (click to disable)" : "Enable sound alerts"}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Notification toggle */}
            <button
              onClick={async () => {
                if (notifPermission === "unsupported") return;
                if (notifPermission !== "granted") {
                  const perm = await requestNotificationPermission();
                  setNotifPermission(perm);
                  if (perm === "granted") {
                    setNotificationsOn(true);
                    setNotificationsEnabled(true);
                  }
                } else {
                  const next = !notificationsOn;
                  setNotificationsOn(next);
                  setNotificationsEnabled(next);
                }
              }}
              className={`p-2 rounded-lg transition-colors ${
                notificationsOn && notifPermission === "granted"
                  ? "text-emerald-400 hover:bg-emerald-500/10"
                  : "text-white/30 hover:bg-white/5 hover:text-white/50"
              }`}
              title={
                notifPermission === "unsupported"
                  ? "Notifications not supported"
                  : notificationsOn
                  ? "Notifications on (click to disable)"
                  : "Enable notifications"
              }
            >
              {notificationsOn && notifPermission === "granted" ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
            </button>

            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors duration-500 ${
              wsConnected
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-red-500/10 border-red-500/20"
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                wsConnected ? "bg-emerald-400" : "bg-red-400"
              }`} />
              <span className={`text-[11px] font-medium ${
                wsConnected ? "text-emerald-400" : "text-red-400"
              }`}>
                {wsConnected ? "Live" : "Reconnecting..."}
              </span>
            </div>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-[10px] font-bold text-white">
                  {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-white/40 hidden sm:block" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#1e2130] border border-[#2a2d3a] rounded-xl shadow-2xl py-1 z-50">
                    <div className="px-3 py-2 border-b border-[#2a2d3a]/50">
                      <p className="text-xs font-semibold text-white">{user.name}</p>
                      <p className="text-[10px] text-white/30">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { logout(); router.replace("/login"); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Setup Wizard */}
      {showSetup && (
        <SetupWizard onComplete={() => setShowSetup(false)} />
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
