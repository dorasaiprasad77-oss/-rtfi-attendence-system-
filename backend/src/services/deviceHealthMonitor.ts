import prisma from "../config/database";
import { emitDeviceEvent, emitStatsUpdate } from "../config/socket";

const CHECK_INTERVAL_MS = 60_000; // Check every 60 seconds
const OFFLINE_THRESHOLD_MS = 5 * 60_000; // 5 minutes without heartbeat = offline

let monitorTimer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

async function checkDeviceHealth(): Promise<void> {
  if (isRunning) return; // Skip if previous check still running
  isRunning = true;

  try {
    const cutoff = new Date(Date.now() - OFFLINE_THRESHOLD_MS);

    // Find all devices currently marked ONLINE but with stale lastSeen
    const staleDevices = await prisma.device.findMany({
      where: {
        status: "ONLINE",
        lastSeen: { lt: cutoff },
      },
    });

    if (staleDevices.length === 0) {
      isRunning = false;
      return;
    }

    console.log(`🏥 Marking ${staleDevices.length} device(s) as OFFLINE (no heartbeat in 5min)`);

    // Batch update all stale devices to OFFLINE
    const result = await prisma.device.updateMany({
      where: {
        id: { in: staleDevices.map((d) => d.id) },
      },
      data: {
        status: "OFFLINE",
      },
    });

    console.log(`🏥 Updated ${result.count} device(s) to OFFLINE`);

    // Emit offline event for each device via WebSocket
    for (const device of staleDevices) {
      emitDeviceEvent({
        type: "device:offline",
        timestamp: new Date().toISOString(),
        data: {
          id: device.id,
          deviceName: device.deviceName,
          location: device.location,
          status: "OFFLINE",
          lastSeen: device.lastSeen?.toISOString() || null,
        },
      });
    }

    // Emit updated stats so the dashboard active device count refreshes
    const [onlineCount, totalStudents, presentCount] = await Promise.all([
      prisma.device.count({ where: { status: "ONLINE" } }),
      prisma.user.count({ where: { isActive: true, role: "STUDENT" } }),
      prisma.attendance.count({
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date(new Date().setHours(0, 0, 0, 0)).getTime() + 86_400_000),
          },
          status: { in: ["PRESENT", "LATE"] },
        },
      }),
    ]);

    emitStatsUpdate({
      type: "stats:update",
      timestamp: new Date().toISOString(),
      data: {
        presentToday: presentCount,
        absentToday: totalStudents - presentCount,
        activeDevices: onlineCount,
      },
    });
  } catch (error) {
    console.error("🏥 Device health check error:", error);
  } finally {
    isRunning = false;
  }
}

export function startDeviceHealthMonitor(): void {
  if (monitorTimer) return; // Already running
  console.log(`🏥 Device health monitor started (checking every ${CHECK_INTERVAL_MS / 1000}s, threshold: ${OFFLINE_THRESHOLD_MS / 1000}s)`);
  monitorTimer = setInterval(checkDeviceHealth, CHECK_INTERVAL_MS);
}

export function stopDeviceHealthMonitor(): void {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
    console.log("🏥 Device health monitor stopped");
  }
}
