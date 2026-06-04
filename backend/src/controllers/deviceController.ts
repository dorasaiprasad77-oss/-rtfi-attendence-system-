import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import prisma from "../config/database";
import { AuthRequest } from "../types";
import { emitDeviceEvent } from "../config/socket";

export async function getDevices(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const devices = await prisma.device.findMany({
      include: {
        _count: {
          select: { attendance: true, accessLogs: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ devices });
  } catch (error) {
    console.error("Get devices error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function registerDevice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { deviceName, location } = req.body;
    const apiKey = uuidv4();

    const device = await prisma.device.create({
      data: {
        deviceName,
        location,
        apiKey,
        status: "OFFLINE",
      },
    });

    res.status(201).json(device);
  } catch (error) {
    console.error("Register device error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateDeviceStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status, location, deviceName } = req.body;

    const device = await prisma.device.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(location && { location }),
        ...(deviceName && { deviceName }),
        lastSeen: new Date(),
      },
    });

    // Emit device status change via WebSocket
    emitDeviceEvent({
      type: "device:status",
      timestamp: new Date().toISOString(),
      data: {
        id: device.id,
        deviceName: device.deviceName,
        location: device.location,
        status: device.status,
        lastSeen: device.lastSeen?.toISOString() || null,
      },
    });

    res.json(device);
  } catch (error) {
    console.error("Update device error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteDevice(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    await prisma.device.delete({ where: { id } });

    res.json({ message: "Device deleted successfully" });
  } catch (error) {
    console.error("Delete device error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Device heartbeat endpoint (authenticated by API key, not JWT)
export async function deviceHeartbeat(req: AuthRequest, res: Response): Promise<void> {
  try {
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

    await prisma.device.update({
      where: { id: device.id },
      data: { lastSeen: new Date(), status: "ONLINE" },
    });

    // Emit device online event via WebSocket
    emitDeviceEvent({
      type: "device:online",
      timestamp: new Date().toISOString(),
      data: {
        id: device.id,
        deviceName: device.deviceName,
        location: device.location,
        status: "ONLINE",
        lastSeen: new Date().toISOString(),
      },
    });

    res.json({ status: "OK", deviceId: device.id });
  } catch (error) {
    console.error("Device heartbeat error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
