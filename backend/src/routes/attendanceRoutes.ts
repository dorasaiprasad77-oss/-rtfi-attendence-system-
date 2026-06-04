import { Router } from "express";
import {
  processRfidScan,
  getAttendance,
  getMyAttendance,
  getDashboardStats,
  updateAttendanceStatus,
} from "../controllers/attendanceController";
import { authenticate, authorize } from "../middleware/auth";
import { deviceAuth } from "../middleware/deviceAuth";
import { validate } from "../middleware/validate";
import { rfidScanSchema } from "../types/schemas";

const router = Router();

// RFID scan endpoint - authenticated by device API key
router.post("/scan", deviceAuth, validate(rfidScanSchema), processRfidScan);

// Dashboard stats - admin/faculty only
router.get("/dashboard", authenticate, authorize("ADMIN", "FACULTY"), getDashboardStats);

// My attendance - any authenticated user
router.get("/my", authenticate, getMyAttendance);

// Update attendance status (mark as excused, etc.) - admin/faculty only
router.put("/:id/status", authenticate, authorize("ADMIN", "FACULTY"), updateAttendanceStatus);

// All attendance records - admin/faculty only
router.get("/", authenticate, authorize("ADMIN", "FACULTY"), getAttendance);

export default router;
