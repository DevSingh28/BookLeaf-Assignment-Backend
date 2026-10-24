// controllers/knowledgeBase.controller.js

import pool from "../config/db.js";
import { getPagination } from "../utils/pagination.js";

// GET /api/knowledge-base?page=1&limit=10&search=royalty
export const getKnowledgeBaseArticles = async (req, res) => {
  try {
    const pagination = getPagination(req.query);

    if (pagination.error) {
      return res.status(400).json({
        message: pagination.error,
      });
    }

    const { page, limit, offset } = pagination;

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const values = [];
    let searchCondition = "";

    if (search) {
      values.push(`%${search}%`);

      searchCondition = `
        AND (
          title ILIKE $1
          OR content ILIKE $1
          OR category ILIKE $1
          OR EXISTS (
            SELECT 1
            FROM unnest(keywords) AS keyword
            WHERE keyword ILIKE $1
          )
        )
      `;
    }

    const countResult = await pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM knowledge_base_articles
        WHERE is_published = TRUE
        ${searchCondition}
      `,
      values
    );

    const total = countResult.rows[0].total;

    const limitPosition = values.length + 1;
    const offsetPosition = values.length + 2;

    const articlesResult = await pool.query(
      `
        SELECT
          id,
          slug,
          title,
          category,
          content,
          keywords,
          updated_at
        FROM knowledge_base_articles
        WHERE is_published = TRUE
        ${searchCondition}
        ORDER BY updated_at DESC
        LIMIT $${limitPosition}
        OFFSET $${offsetPosition}
      `,
      [...values, limit, offset]
    );

    return res.status(200).json({
      articles: articlesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get knowledge base error:", error);

    return res.status(500).json({
      message: "Unable to fetch knowledge base articles.",
    });
  }
};

// GET /api/knowledge-base/:slug
export const getKnowledgeBaseArticle = async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT
          id,
          slug,
          title,
          category,
          content,
          keywords,
          updated_at
        FROM knowledge_base_articles
        WHERE slug = $1
          AND is_published = TRUE
      `,
      [req.params.slug]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Knowledge base article not found.",
      });
    }

    return res.status(200).json({
      article: result.rows[0],
    });
  } catch (error) {
    console.error("Get knowledge base article error:", error);

    return res.status(500).json({
      message: "Unable to fetch knowledge base article.",
    });
  }
};