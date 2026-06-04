import { Router } from "express";
import { generateReport, getAccessLogs } from "../controllers/reportController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.use(authorize("ADMIN", "FACULTY"));

router.get("/", generateReport);
router.get("/access-logs", getAccessLogs);

export default router;
