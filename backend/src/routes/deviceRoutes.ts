import { Router } from "express";
import {
  getDevices,
  registerDevice,
  updateDeviceStatus,
  deleteDevice,
  deviceHeartbeat,
} from "../controllers/deviceController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Device heartbeat - authenticated by API key
router.post("/heartbeat", deviceHeartbeat);

// Admin routes
router.get("/", authenticate, authorize("ADMIN"), getDevices);
router.post("/", authenticate, authorize("ADMIN"), registerDevice);
router.put("/:id", authenticate, authorize("ADMIN"), updateDeviceStatus);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteDevice);

export default router;
