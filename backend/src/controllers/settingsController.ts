import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../types";

// Default settings structure
const DEFAULTS: Record<string, { value: any; category: string }> = {
  // Attendance thresholds
  late_threshold_minutes: { value: 15, category: "attendance" },
  auto_mark_absent_after_minutes: { value: 60, category: "attendance" },
  require_rfid_for_checkin: { value: true, category: "attendance" },

  // Working hours
  school_start_time: { value: "08:00", category: "hours" },
  school_end_time: { value: "16:00", category: "hours" },
  work_start_time: { value: "09:00", category: "hours" },
  work_end_time: { value: "17:00", category: "hours" },

  // Device health
  device_offline_threshold_minutes: { value: 5, category: "device" },
  device_heartbeat_interval_seconds: { value: 30, category: "device" },

  // Notifications
  notify_on_access_denied: { value: true, category: "notifications" },
  notify_on_device_offline: { value: true, category: "notifications" },
  notify_on_late_arrival: { value: false, category: "notifications" },
};

export async function getSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Get all stored settings
    const stored = await prisma.systemSetting.findMany();
    const storedMap = new Map(stored.map((s) => [s.key, s.value]));

    // Merge defaults with stored (stored overrides defaults)
    const settings: Record<string, any> = {};
    const categories: Record<string, Record<string, any>> = {};

    for (const [key, def] of Object.entries(DEFAULTS)) {
      const value = storedMap.has(key) ? storedMap.get(key) : def.value;
      settings[key] = value;
      if (!categories[def.category]) categories[def.category] = {};
      categories[def.category][key] = value;
    }

    res.json({ settings, categories });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== "object") {
      res.status(400).json({ error: "Settings object is required" });
      return;
    }

    // Validate keys exist in defaults
    const validKeys = Object.keys(DEFAULTS);
    const invalidKeys = Object.keys(settings).filter((k) => !validKeys.includes(k));
    if (invalidKeys.length > 0) {
      res.status(400).json({ error: `Invalid setting keys: ${invalidKeys.join(", ")}` });
      return;
    }

    // Upsert each setting
    const upserts = Object.entries(settings).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value: value as any, category: DEFAULTS[key].category },
        create: { key, value: value as any, category: DEFAULTS[key].category },
      })
    );

    await Promise.all(upserts);

    // Return updated settings
    const stored = await prisma.systemSetting.findMany();
    const storedMap = new Map(stored.map((s) => [s.key, s.value]));
    const merged: Record<string, any> = {};
    for (const [key, def] of Object.entries(DEFAULTS)) {
      merged[key] = storedMap.has(key) ? storedMap.get(key) : def.value;
    }

    res.json({ settings: merged, message: "Settings updated successfully" });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
