import pool from "../config/db.js";
import { getPagination } from "../utils/pagination.js";

export const createTicket = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { bookId, category, subject, description } = req.body;

    if (
      typeof category !== "string" ||
      typeof subject !== "string" ||
      typeof description !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Category, subject, and description are required.",
      });
    }

    const normalizedCategory = category.trim();
    const normalizedSubject = subject.trim();
    const normalizedDescription = description.trim();

    if (!normalizedSubject || normalizedSubject.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Subject is required and must not exceed 200 characters.",
      });
    }

    if (
      !normalizedDescription ||
      normalizedDescription.length > 10000
    ) {
      return res.status(400).json({
        success: false,
        message: "Description is required and must not exceed 10000 characters.",
      });
    }

    if (!normalizedCategory) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid category.",
      });
    }

    const categoryResult = await pool.query(
      `SELECT id, name
       FROM ticket_categories
       WHERE LOWER(name) = LOWER($1)
       LIMIT 1`,
      [normalizedCategory]
    );

    if (categoryResult.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket category.",
      });
    }

    const categoryId = categoryResult.rows[0].id;

    if (bookId !== undefined && bookId !== null && bookId !== "") {
      const bookResult = await pool.query(
        `SELECT id
         FROM books
         WHERE id = $1 AND author_id = $2`,
        [bookId, userId]
      );

      if (bookResult.rowCount === 0) {
        return res.status(400).json({
          success: false,
          message: "The selected book is invalid.",
        });
      }
    }

    const lookupResult = await pool.query(
      `SELECT
         (SELECT id FROM ticket_statuses
          WHERE LOWER(name) = 'open' LIMIT 1) AS status_id,
         (SELECT id FROM ticket_priorities
          WHERE LOWER(name) = 'medium' LIMIT 1) AS priority_id`
    );

    const { status_id: statusId, priority_id: priorityId } =
      lookupResult.rows[0];

    if (!statusId || !priorityId) {
      throw new Error(
        "Required ticket status or priority lookup records are missing."
      );
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const ticketResult = await client.query(
  `
    INSERT INTO tickets (
      author_id,
      created_by,
      book_id,
      category_id,
      status_id,
      priority_id,
      subject,
      description
    )
    VALUES ($1, $1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `,
  [
    userId,
    bookId || null,
    categoryId,
    statusId,
    priorityId,
    normalizedSubject,
    normalizedDescription,
  ]
);

      const ticket = ticketResult.rows[0];

      const messageResult = await client.query(
        `
          INSERT INTO ticket_messages (
            ticket_id,
            sender_id,
            message_type,
            body
          )
          VALUES ($1, $2, 'reply', $3)
          RETURNING *
        `,
        [ticket.id, userId, description.trim()]
      );

      await client.query("COMMIT");

      return res.status(201).json({
        message: "Support ticket created successfully.",
        ticket,
        initialMessage: messageResult.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const getAuthorTickets = async (req, res, next) => {
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
    const conditions = ["t.author_id = $1"];

    if (search) {
      values.push(`%${search}%`);
      const param = `$${values.length}`;

      conditions.push(
        `(t.subject ILIKE ${param}
          OR t.description ILIKE ${param}
          OR CAST(t.ticket_number AS TEXT) ILIKE ${param})`
      );
    }

    if (status) {
      values.push(status);
      conditions.push(
        `LOWER(ts.name) = LOWER($${values.length})`
      );
    }

    const whereClause = conditions.join(" AND ");

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM tickets t
       JOIN ticket_statuses ts ON ts.id = t.status_id
       WHERE ${whereClause}`,
      values
    );

    const total = countResult.rows[0].total;

    const ticketsResult = await pool.query(
      `SELECT
         t.id,
         t.ticket_number,
         t.subject,
         t.description,
         ts.name AS status,
         tp.name AS priority,
         tc.name AS category,
         b.title AS book_title,
         t.created_at,
         t.updated_at,
         t.last_message_at,
         t.resolved_at,
         t.closed_at
       FROM tickets t
       JOIN ticket_statuses ts ON ts.id = t.status_id
       JOIN ticket_priorities tp ON tp.id = t.priority_id
       JOIN ticket_categories tc ON tc.id = t.category_id
       LEFT JOIN books b ON b.id = t.book_id
       WHERE ${whereClause}
       ORDER BY t.last_message_at DESC, t.created_at DESC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      data: {
        tickets: ticketsResult.rows,
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

export const getAuthorTicketById = async (req, res, next) => {
  try {
    const authorId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
         t.id,
         t.ticket_number,
         t.author_id,
         t.book_id,
         t.subject,
         t.description,
         ts.name AS status,
         tp.name AS priority,
         tc.name AS category,
         b.title AS book_title,
         t.created_at,
         t.updated_at,
         t.last_message_at,
         t.resolved_at,
         t.closed_at
       FROM tickets t
       JOIN ticket_statuses ts ON ts.id = t.status_id
       JOIN ticket_priorities tp ON tp.id = t.priority_id
       JOIN ticket_categories tc ON tc.id = t.category_id
       LEFT JOIN books b ON b.id = t.book_id
       WHERE t.id = $1 AND t.author_id = $2
       LIMIT 1`,
      [id, authorId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ticket: result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
};