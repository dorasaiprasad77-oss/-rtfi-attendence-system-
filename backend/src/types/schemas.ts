import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  }),
});

export const registerUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    rollNo: z.string().optional(),
    department: z.string().optional(),
    role: z.enum(["ADMIN", "FACULTY", "STUDENT"]).default("STUDENT"),
    rfidUid: z.string().optional(),
  }),
});

export const rfidScanSchema = z.object({
  body: z.object({
    uid: z.string().min(1, "RFID UID is required"),
    deviceId: z.string().min(1, "Device ID is required"),
  }),
});

export const deviceStatusSchema = z.object({
  body: z.object({
    deviceName: z.string().optional(),
    location: z.string().optional(),
    status: z.enum(["ONLINE", "OFFLINE", "MAINTENANCE"]).optional(),
  }),
});

export const attendanceQuerySchema = z.object({
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    userId: z.string().uuid().optional(),
    status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]).optional(),
    department: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const reportQuerySchema = z.object({
  query: z.object({
    type: z.enum(["daily", "weekly", "monthly", "custom"]),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    department: z.string().optional(),
    userId: z.string().uuid().optional(),
  }),
});
