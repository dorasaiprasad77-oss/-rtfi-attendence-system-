import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest, RfidScanPayload } from "../types";
import { emitAttendanceEvent, emitStatsUpdate } from "../config/socket";

export async function processRfidScan(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { uid } = req.body as RfidScanPayload;
    const device = (req as any).device;
    if (!device) {
      res.status(401).json({ error: "Device not authenticated" });
      return;
    }
    const deviceId = device.id;

    // Find the RFID card
    const card = await prisma.rfidCard.findFirst({
      where: { uid, isActive: true },
      include: { user: true },
    });

    if (!card || !card.user || !card.user.isActive) {
      // Log the denied attempt to system logs instead of access logs (no valid userId)
      await prisma.systemLog.create({
        data: {
          level: "WARN",
          source: "rfid-scan",
          message: `Denied access for unknown card UID: ${uid}`,
          metadata: { uid, deviceId },
        },
      }).catch(() => {}); // non-critical, don't fail the request

      // Emit denied access event via WebSocket
      emitAttendanceEvent({
        type: "attendance:denied",
        timestamp: new Date().toISOString(),
        data: {
          id: "denied",
          user: { id: "unknown", name: "Unknown Card", rollNo: null, department: null, photoUrl: null },
          device: { id: device.id, deviceName: device.deviceName, location: device.location },
          status: "DENIED",
          access: "DENIED",
          message: `Unknown card UID: ${uid}`,
        },
      });

      res.status(401).json({
        access: "DENIED",
        message: "Invalid or unrecognized RFID card",
        greenLed: false,
        redLed: true,
        buzzer: true,
        unlockDoor: false,
      });
      return;
    }

    const user = card.user;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already marked present today
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
    });

    // Mark attendance
    const attendance = existingAttendance
      ? existingAttendance
      : await prisma.attendance.create({
          data: {
            userId: user.id,
            date: today,
            time: new Date(),
            status: "PRESENT",
            deviceId,
            method: "rfid",
          },
        });

    // Log access
    const accessLog = await prisma.accessLog.create({
      data: {
        userId: user.id,
        deviceId,
        result: "GRANTED",
      },
    });

    // Update device last seen
    await prisma.device.update({
      where: { id: deviceId },
      data: { lastSeen: new Date(), status: "ONLINE" },
    });

    const responseData = {
      access: "GRANTED" as const,
      user: {
        id: user.id,
        name: user.name,
        rollNo: user.rollNo,
        department: user.department,
        photoUrl: user.photoUrl,
      },
      attendance: {
        id: attendance.id,
        date: attendance.date,
        time: attendance.time,
        status: attendance.status,
        alreadyMarked: !!existingAttendance,
      },
      greenLed: true,
      redLed: false,
      buzzer: false,
      unlockDoor: true,
      unlockDuration: 5,
    };

    // Emit real-time attendance event via WebSocket
    emitAttendanceEvent({
      type: "attendance:new",
      timestamp: new Date().toISOString(),
      data: {
        id: attendance.id,
        user: {
          id: user.id,
          name: user.name,
          rollNo: user.rollNo,
          department: user.department,
          photoUrl: user.photoUrl,
        },
        device: { id: device.id, deviceName: device.deviceName, location: device.location },
        status: attendance.status,
        alreadyMarked: !!existingAttendance,
        access: "GRANTED",
      },
    });

    // Emit updated stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const [presentCount, totalStudents] = await Promise.all([
      prisma.attendance.count({
        where: { date: { gte: todayStart, lt: tomorrowStart }, status: { in: ["PRESENT", "LATE"] } },
      }),
      prisma.user.count({ where: { isActive: true, role: "STUDENT" } }),
    ]);

    const activeDeviceCount = await prisma.device.count({ where: { status: "ONLINE" } });

    emitStatsUpdate({
      type: "stats:update",
      timestamp: new Date().toISOString(),
      data: {
        presentToday: presentCount,
        absentToday: totalStudents - presentCount,
        activeDevices: activeDeviceCount,
      },
    });

    res.json(responseData);
  } catch (error) {
    console.error("RFID scan error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAttendance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { startDate, endDate, userId, status, department, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (department) {
      where.user = { department };
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, rollNo: true, department: true, photoUrl: true } },
          device: { select: { deviceName: true, location: true } },
        },
        skip,
        take: limitNum,
        orderBy: [{ date: "desc" }, { time: "desc" }],
      }),
      prisma.attendance.count({ where }),
    ]);

    res.json({
      records,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get attendance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getMyAttendance(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { startDate, endDate } = req.query as Record<string, string>;

    const where: any = { userId: req.user!.id };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const records = await prisma.attendance.findMany({
      where,
      include: { device: { select: { deviceName: true, location: true } } },
      orderBy: [{ date: "desc" }, { time: "desc" }],
    });

    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === "PRESENT").length;
    const lateDays = records.filter((r) => r.status === "LATE").length;
    const absentDays = records.filter((r) => r.status === "ABSENT").length;
    const attendanceRate = totalDays > 0 ? ((presentDays + lateDays) / totalDays) * 100 : 0;

    res.json({
      records,
      summary: {
        totalDays,
        presentDays,
        lateDays,
        absentDays,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Get my attendance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getDashboardStats(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalUsers, presentToday, totalDevices, onlineDevices, recentAttendance, departmentStats, weeklyData] =
      await Promise.all([
        prisma.user.count({ where: { isActive: true, role: "STUDENT" } }),
        prisma.attendance.count({
          where: { date: { gte: today, lt: tomorrow }, status: { in: ["PRESENT", "LATE"] } },
        }),
        prisma.device.count(),
        prisma.device.count({ where: { status: "ONLINE" } }),
        prisma.attendance.findMany({
          where: { date: { gte: today, lt: tomorrow } },
          include: {
            user: { select: { name: true, rollNo: true, department: true } },
            device: { select: { deviceName: true } },
          },
          orderBy: { time: "desc" },
          take: 20,
        }),
        prisma.user.groupBy({
          by: ["department"],
          where: { isActive: true, role: "STUDENT" },
          _count: { id: true },
        }),
        // Last 7 days trend
        prisma.$queryRaw`
          SELECT
            date,
            COUNT(*) as count,
            SUM(CASE WHEN status = 'PRESENT' OR status = 'LATE' THEN 1 ELSE 0 END) as present_count
          FROM attendance
          WHERE date >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
          GROUP BY date
          ORDER BY date ASC
        `,
      ]);

    const absentToday = totalUsers - presentToday;

    res.json({
      totalUsers,
      presentToday,
      absentToday,
      activeDevices: onlineDevices,
      totalDevices,
      recentActivity: recentAttendance,
      attendanceByDepartment: departmentStats.map((d) => ({
        department: d.department || "Unassigned",
        total: d._count.id,
      })),
      weeklyTrend: weeklyData,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
