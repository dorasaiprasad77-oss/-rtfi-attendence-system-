import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../types";

export async function getSetupStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [totalDevices, totalStudents, totalFaculty] = await Promise.all([
      prisma.device.count(),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({ where: { role: "FACULTY" } }),
    ]);

    res.json({
      hasDevices: totalDevices > 0,
      hasStudents: totalStudents > 0,
      hasFaculty: totalFaculty > 0,
      totalDevices,
      totalStudents,
      totalFaculty,
      setupComplete: totalDevices > 0 && totalStudents > 0,
    });
  } catch (error) {
    console.error("Get setup status error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
