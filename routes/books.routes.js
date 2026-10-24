import { Router } from "express";
import {
  getAuthorBooks,
  getAuthorBookById,
  getBookRoyalties,
} from "../controllers/books.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protect);

router.get("/", getAuthorBooks);
router.get("/:id/royalties", getBookRoyalties);
router.get("/:id", getAuthorBookById);

export default router;