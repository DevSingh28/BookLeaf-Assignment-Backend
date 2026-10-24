import { Router } from "express";
import {
  createTicket,
  getAuthorTickets,
  getAuthorTicketById,
} from "../controllers/tickets.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protect);

router.post("/", createTicket);
router.get("/", getAuthorTickets);
router.get("/:id", getAuthorTicketById);

export default router;