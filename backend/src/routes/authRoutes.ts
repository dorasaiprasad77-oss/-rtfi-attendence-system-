import { Router } from "express";
import { login, getProfile, updateProfile } from "../controllers/authController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { loginSchema } from "../types/schemas";

const router = Router();

router.post("/login", validate(loginSchema), login);
router.get("/profile", authenticate, getProfile);
router.put("/profile", authenticate, updateProfile);

export default router;
