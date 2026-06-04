import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../types";

export async function generateReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { type, startDate, endDate, department, userId } = req.query as Record<string, string>;

    let start: Date;
    let end: Date = new Date();
    end.setHours(23, 59, 59, 999);

    const now = new Date();

    switch (type) {
      case "daily":
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case "weekly":
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        break;
      case "monthly":
        start = new Date(now);
        start.setMonth(start.getMonth() - 1);
        break;
      case "custom":
        start = startDate ? new Date(startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (endDate) end = new Date(endDate);
        break;
      default:
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
    }

    // Build where clause
    const where: any = {
      date: { gte: start, lte: end },
    };
    if (userId) where.userId = userId;
    if (department) where.user = { department };

    // Get attendance summary
    const records = await prisma.attendance.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, rollNo: true, department: true } },
        device: { select: { deviceName: true, location: true } },
      },
      orderBy: [{ date: "desc" }, { time: "desc" }],
    });

    // Group by user
    const userStats: Record<string, any> = {};
    records.forEach((record) => {
      const userId = record.userId;
      if (!userStats[userId]) {
        userStats[userId] = {
          user: record.user,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          total: 0,
        };
      }
      userStats[userId].total++;
      userStats[userId][record.status.toLowerCase()]++;
    });

    // Department summary
    const departmentStats: Record<string, { total: number; present: number; rate: number }> = {};
    Object.values(userStats).forEach((stat: any) => {
      const dept = stat.user.department || "Unassigned";
      if (!departmentStats[dept]) {
        departmentStats[dept] = { total: 0, present: 0, rate: 0 };
      }
      departmentStats[dept].total += stat.total;
      departmentStats[dept].present += stat.present + stat.late;
    });
    Object.keys(departmentStats).forEach((dept) => {
      const s = departmentStats[dept];
      s.rate = s.total > 0 ? Math.round(((s.present / s.total) * 100 * 100) / 100) : 0;
    });

    const totalRecords = records.length;
    const totalPresent = records.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
    const overallRate = totalRecords > 0 ? Math.round(((totalPresent / totalRecords) * 100 * 100) / 100) : 0;

    res.json({
      period: { type, start, end },
      summary: {
        totalRecords,
        overallAttendanceRate: overallRate,
        byStatus: {
          present: records.filter((r) => r.status === "PRESENT").length,
          late: records.filter((r) => r.status === "LATE").length,
          absent: records.filter((r) => r.status === "ABSENT").length,
          excused: records.filter((r) => r.status === "EXCUSED").length,
        },
      },
      userStats: Object.values(userStats),
      departmentStats,
      records,
    });
  } catch (error) {
    console.error("Generate report error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAccessLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { page = "1", limit = "50", userId, deviceId } = req.query as Record<string, string>;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (userId) where.userId = userId;
    if (deviceId) where.deviceId = deviceId;

    const [logs, total] = await Promise.all([
      prisma.accessLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, rollNo: true, department: true } },
          device: { select: { deviceName: true, location: true } },
        },
        skip,
        take: limitNum,
        orderBy: { entryTime: "desc" },
      }),
      prisma.accessLog.count({ where }),
    ]);

    res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get access logs error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
