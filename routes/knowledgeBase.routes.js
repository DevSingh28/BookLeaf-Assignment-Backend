// routes/knowledgeBase.routes.js

import express from "express";
import {
  getKnowledgeBaseArticles,
  getKnowledgeBaseArticle,
} from "../controllers/knowledgeBase.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getKnowledgeBaseArticles);
router.get("/:slug", getKnowledgeBaseArticle);

export default router;