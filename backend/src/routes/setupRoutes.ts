import { Router } from "express";
import { getSetupStatus } from "../controllers/setupController";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.use(authorize("ADMIN"));

router.get("/status", getSetupStatus);

export default router;
