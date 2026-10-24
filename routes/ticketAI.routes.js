import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";
import {
  classifyTicket,
  generateTicketDraft,
} from "../controllers/ticketAI.controller.js";

const router = express.Router();

router.use(protect, requireAdmin);

router.post("/tickets/:id/ai/classify", classifyTicket);
router.post("/tickets/:id/ai/draft", generateTicketDraft);

export default router;