import express from "express";
import {
  getTicketMessages,
  createTicketMessage,
} from "../controllers/ticketMessages.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/:id/messages", getTicketMessages);
router.post("/:id/messages", createTicketMessage);

export default router;