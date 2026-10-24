
import pool from "../config/db.js";

// GET /api/dashboard
export const getAuthorDashboard = async (req, res, next) => {
  try {
    const authorId = req.user.id;

    // 1. Fetch author statistics
    const statsQuery = `
      SELECT
        (
          SELECT COUNT(*)
          FROM books b
          WHERE b.author_id = $1
        ) AS total_books,

        (
          SELECT COUNT(*)
          FROM books b
          WHERE b.author_id = $1
            AND LOWER(b.production_status) = 'published'
        ) AS published_books,

        (
          SELECT COALESCE(SUM(brs.total_royalty_earned), 0)
          FROM books b
          JOIN book_royalty_summaries brs
            ON brs.book_id = b.id
          WHERE b.author_id = $1
        ) AS total_royalties,

        (
          SELECT COALESCE(SUM(brs.royalty_paid), 0)
          FROM books b
          JOIN book_royalty_summaries brs
            ON brs.book_id = b.id
          WHERE b.author_id = $1
        ) AS royalties_paid,

        (
          SELECT COALESCE(SUM(brs.royalty_pending), 0)
          FROM books b
          JOIN book_royalty_summaries brs
            ON brs.book_id = b.id
          WHERE b.author_id = $1
        ) AS royalties_pending,

        (
          SELECT COALESCE(SUM(brs.total_copies_sold), 0)
          FROM books b
          JOIN book_royalty_summaries brs
            ON brs.book_id = b.id
          WHERE b.author_id = $1
        ) AS total_copies_sold,

        (
          SELECT COUNT(*)
          FROM tickets t
          JOIN ticket_statuses ts
            ON ts.id = t.status_id
          WHERE t.author_id = $1
            AND LOWER(ts.name) IN ('open', 'in progress')
        ) AS open_tickets
    `;

    const statsResult = await pool.query(statsQuery, [authorId]);

    const rawStats = statsResult.rows[0];

    // PostgreSQL COUNT and numeric aggregates may be returned as strings.
    const stats = {
      totalBooks: Number(rawStats.total_books),
      publishedBooks: Number(rawStats.published_books),
      totalRoyalties: Number(rawStats.total_royalties),
      royaltiesPaid: Number(rawStats.royalties_paid),
      royaltiesPending: Number(rawStats.royalties_pending),
      totalCopiesSold: Number(rawStats.total_copies_sold),
      openTickets: Number(rawStats.open_tickets),
    };

    // 2. Fetch the author's five most recently updated books
    const booksQuery = `
      SELECT
        b.id,
        b.title,
        b.isbn,
        b.genre,
        b.production_status,
        b.publication_date,
        b.mrp,
        COALESCE(brs.total_copies_sold, 0) AS copies_sold,
        COALESCE(brs.total_royalty_earned, 0) AS royalty_earned,
        COALESCE(brs.royalty_paid, 0) AS royalty_paid,
        COALESCE(brs.royalty_pending, 0) AS royalty_pending
      FROM books b
      LEFT JOIN book_royalty_summaries brs
        ON brs.book_id = b.id
      WHERE b.author_id = $1
      ORDER BY b.updated_at DESC, b.created_at DESC
      LIMIT 5
    `;

    const booksResult = await pool.query(booksQuery, [authorId]);

    // 3. Fetch the author's five most recently updated tickets
    const ticketsQuery = `
      SELECT
        t.id,
        t.ticket_number,
        t.subject,
        t.description,
        ts.name AS status,
        tp.name AS priority,
        tc.name AS category,
        t.created_at,
        t.updated_at,
        t.last_message_at,
        b.title AS book_title
      FROM tickets t
      JOIN ticket_statuses ts
        ON ts.id = t.status_id
      JOIN ticket_priorities tp
        ON tp.id = t.priority_id
      JOIN ticket_categories tc
        ON tc.id = t.category_id
      LEFT JOIN books b
        ON b.id = t.book_id
      WHERE t.author_id = $1
      ORDER BY t.last_message_at DESC, t.created_at DESC
      LIMIT 5
    `;

    const ticketsResult = await pool.query(ticketsQuery, [authorId]);

    return res.status(200).json({
      success: true,
      data: {
        stats,
        recentBooks: booksResult.rows,
        recentTickets: ticketsResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};