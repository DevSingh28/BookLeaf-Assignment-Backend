// routes/profile.routes.js

import express from "express";
import { getProfile, updateProfile } from "../controllers/profile.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getProfile);
router.patch("/", updateProfile);

export default router;