// routes/adminTickets.routes.js

import express from "express";

import {
  getAdminTickets,
  getAdminTicketById,
  updateAdminTicketStatus,
  updateAdminTicketPriority,
  updateAdminTicketCategory,
  assignAdminTicket,
  createAdminTicketNote,
    replyToAdminTicket,
} from "../controllers/adminTickets.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";

const router = express.Router();

router.use(protect, requireAdmin);

router.get("/tickets", getAdminTickets);
router.get("/tickets/:id", getAdminTicketById);

router.patch("/tickets/:id/status", updateAdminTicketStatus);
router.patch("/tickets/:id/priority", updateAdminTicketPriority);
router.patch("/tickets/:id/category", updateAdminTicketCategory);
router.patch("/tickets/:id/assign", assignAdminTicket);
router.post("/tickets/:id/reply", replyToAdminTicket);
router.post("/tickets/:id/notes", createAdminTicketNote);

export default router;