import { Router } from "express";
import { getSettings, updateSettings } from "../controllers/settingsController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.use(authorize("ADMIN"));

router.get("/", getSettings);
router.put("/", updateSettings);

export default router;
