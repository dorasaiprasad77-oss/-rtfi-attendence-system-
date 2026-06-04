import { Router } from "express";
import multer from "multer";
import { getUsers, getUserById, createUser, updateUser, deleteUser, resetPassword } from "../controllers/userController";
import { bulkImportUsers } from "../controllers/importController";
import { authenticate, authorize } from "../middleware/auth";

// Multer config: accept CSV/Excel files up to 5MB, store in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/csv",
    ];
    if (
      allowed.includes(file.mimetype) ||
      file.originalname.endsWith(".csv") ||
      file.originalname.endsWith(".xlsx") ||
      file.originalname.endsWith(".xls")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV and Excel files are allowed"));
    }
  },
});

const router = Router();

router.use(authenticate);
router.use(authorize("ADMIN"));

router.get("/", getUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.post("/import", upload.single("file"), (err: any, _req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "File is too large. Maximum size is 5MB." });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }
  if (err) {
    res.status(400).json({ error: err.message || "File upload failed" });
    return;
  }
  next();
}, bulkImportUsers);
router.put("/:id", updateUser);
router.post("/:id/reset-password", resetPassword);
router.delete("/:id", deleteUser);

export default router;
