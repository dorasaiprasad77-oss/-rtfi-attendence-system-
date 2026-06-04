import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";

export async function deviceAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    res.status(401).json({ error: "API key required" });
    return;
  }

  const device = await prisma.device.findFirst({ where: { apiKey } });
  if (!device) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  // Attach device info to request
  (req as any).device = device;
  next();
}
