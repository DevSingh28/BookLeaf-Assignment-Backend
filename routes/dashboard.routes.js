import { Router } from "express";
import { getAuthorDashboard } from "../controllers/dashboard.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", protect, getAuthorDashboard);

export default router;