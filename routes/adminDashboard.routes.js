import { Router } from "express";
import { getAdminDashboard } from "../controllers/adminDashboard.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";

const router = Router();

router.use(protect, requireAdmin);
router.get("/dashboard", getAdminDashboard);

export default router;
