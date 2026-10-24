import pool from "../config/db.js";
import { getPagination } from "../utils/pagination.js";

export const getAuthorBooks = async (req, res, next) => {
  try {
    const pagination = getPagination(req.query);

    if (pagination.error) {
      return res.status(400).json({
        message: pagination.error,
      });
    }

    const { page, limit, offset } = pagination;
    const authorId = req.user.id;

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const status =
      typeof req.query.status === "string"
        ? req.query.status.trim()
        : "";

    const values = [authorId];
    const conditions = ["b.author_id = $1"];

    if (search) {
      values.push(`%${search}%`);
      const searchParam = `$${values.length}`;

      conditions.push(
        `(b.title ILIKE ${searchParam} OR b.isbn ILIKE ${searchParam} OR b.genre ILIKE ${searchParam})`
      );
    }

    if (status) {
      values.push(status);
      conditions.push(`LOWER(b.production_status) = LOWER($${values.length})`);
    }

    const whereClause = conditions.join(" AND ");

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM books b
       WHERE ${whereClause}`,
      values
    );

    const total = countResult.rows[0].total;

    const booksResult = await pool.query(
      `SELECT
         b.id,
         b.external_id,
         b.title,
         b.isbn,
         b.genre,
         b.publication_date,
         b.production_status,
         b.mrp,
         b.author_royalty_per_copy,
         b.print_partner,
         b.created_at,
         b.updated_at,
         COALESCE(brs.total_copies_sold, 0) AS total_copies_sold,
         COALESCE(brs.total_royalty_earned, 0) AS total_royalty_earned,
         COALESCE(brs.royalty_paid, 0) AS royalty_paid,
         COALESCE(brs.royalty_pending, 0) AS royalty_pending,
         brs.last_royalty_payout_date
       FROM books b
       LEFT JOIN book_royalty_summaries brs
         ON brs.book_id = b.id
       WHERE ${whereClause}
       ORDER BY b.updated_at DESC, b.created_at DESC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      data: {
        books: booksResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAuthorBookById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const authorId = req.user.id;

    const result = await pool.query(
      `SELECT
         b.id,
         b.external_id,
         b.title,
         b.isbn,
         b.genre,
         b.publication_date,
         b.production_status,
         b.mrp,
         b.author_royalty_per_copy,
         b.print_partner,
         b.created_at,
         b.updated_at,
         COALESCE(brs.total_copies_sold, 0) AS total_copies_sold,
         COALESCE(brs.total_royalty_earned, 0) AS total_royalty_earned,
         COALESCE(brs.royalty_paid, 0) AS royalty_paid,
         COALESCE(brs.royalty_pending, 0) AS royalty_pending,
         brs.last_royalty_payout_date
       FROM books b
       LEFT JOIN book_royalty_summaries brs
         ON brs.book_id = b.id
       WHERE b.id = $1
         AND b.author_id = $2
       LIMIT 1`,
      [id, authorId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        book: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getBookRoyalties = async (req, res, next) => {
  try {
    const { id } = req.params;
    const authorId = req.user.id;

    const result = await pool.query(
      `SELECT
         b.id AS book_id,
         b.title,
         b.mrp,
         b.author_royalty_per_copy,
         COALESCE(brs.total_copies_sold, 0) AS total_copies_sold,
         COALESCE(brs.total_royalty_earned, 0) AS total_royalty_earned,
         COALESCE(brs.royalty_paid, 0) AS royalty_paid,
         COALESCE(brs.royalty_pending, 0) AS royalty_pending,
         brs.last_royalty_payout_date,
         brs.updated_at AS royalty_summary_updated_at
       FROM books b
       LEFT JOIN book_royalty_summaries brs
         ON brs.book_id = b.id
       WHERE b.id = $1
         AND b.author_id = $2
       LIMIT 1`,
      [id, authorId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Book not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        royalties: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};