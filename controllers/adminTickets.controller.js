// controllers/adminTickets.controller.js

import pool from "../config/db.js";
import { getPagination } from "../utils/pagination.js";

// GET /api/admin/tickets?page=1&limit=20
export const getAdminTickets = async (req, res) => {
  try {
    const pagination = getPagination(req.query);

    if (pagination.error) {
      return res.status(400).json({
        message: pagination.error,
      });
    }

    const { page, limit, offset } = pagination;

    const {
      search,
      status,
      category,
      priority,
      from,
      to,
      assignedTo,
      sort = "newest",
    } = req.query;

    const conditions = [];
    const values = [];

    const addCondition = (sql, value) => {
      values.push(value);
      conditions.push(sql.replace("?", `$${values.length}`));
    };

    if (search?.trim()) {
      values.push(`%${search.trim()}%`);
      const p = `$${values.length}`;

      conditions.push(`
        (
          t.subject ILIKE ${p}
          OR t.description ILIKE ${p}
          OR t.ticket_number::text ILIKE ${p}
          OR u.full_name ILIKE ${p}
          OR u.email ILIKE ${p}
        )
      `);
    }

    if (status) {
      addCondition("ts.name = ?", status);
    }

    if (category) {
      addCondition("tc.name = ?", category);
    }

    if (priority) {
      addCondition("tp.name = ?", priority);
    }

    if (from) {
      if (Number.isNaN(Date.parse(from))) {
        return res.status(400).json({
          message: "Invalid from date.",
        });
      }

      addCondition("t.created_at >= ?::date", from);
    }

    if (to) {
      if (Number.isNaN(Date.parse(to))) {
        return res.status(400).json({
          message: "Invalid to date.",
        });
      }

      addCondition("t.created_at < (?::date + INTERVAL '1 day')", to);
    }

    if (assignedTo === "unassigned") {
      conditions.push("t.assigned_to IS NULL");
    } else if (assignedTo) {
      addCondition("t.assigned_to = ?", assignedTo);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const sortOptions = {
      newest: "t.created_at DESC",
      oldest: "t.created_at ASC",
      updated: "t.updated_at DESC",
      priority: `
        tp.sort_order ASC,
        t.created_at ASC
      `,
    };

    if (!Object.hasOwn(sortOptions, sort)) {
      return res.status(400).json({
        message: "Invalid sort option.",
        allowed: Object.keys(sortOptions),
      });
    }

    const fromSql = `
      FROM tickets t
      JOIN users u ON u.id = t.author_id
      JOIN ticket_statuses ts ON ts.id = t.status_id
      JOIN ticket_categories tc ON tc.id = t.category_id
      JOIN ticket_priorities tp ON tp.id = t.priority_id
      LEFT JOIN users assignee ON assignee.id = t.assigned_to
      LEFT JOIN books b ON b.id = t.book_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS message_count
        FROM ticket_messages tm
        WHERE tm.ticket_id = t.id
      ) message_counts ON TRUE
      ${whereClause}
    `;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total ${fromSql}`,
      values
    );

    const total = countResult.rows[0].total;

    const limitPosition = values.length + 1;
    const offsetPosition = values.length + 2;

    const ticketsResult = await pool.query(
      `
        SELECT
          t.id,
          t.ticket_number,
          t.subject,
          t.description,
          t.book_id,
          t.created_at,
          t.updated_at,
          t.last_message_at,
          t.resolved_at,
          t.closed_at,

          u.id AS author_id,
          u.full_name AS author_name,
          u.email AS author_email,

          b.title AS book_title,

          ts.name AS status,
          tc.name AS category,
          tp.name AS priority,

          assignee.id AS assigned_to,
          assignee.full_name AS assignee_name,

          COALESCE(message_counts.message_count, 0)::int
            AS message_count

        ${fromSql}

        ORDER BY ${sortOptions[sort]}

        LIMIT $${limitPosition}
        OFFSET $${offsetPosition}
      `,
      [...values, limit, offset]
    );

    return res.status(200).json({
      tickets: ticketsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get admin tickets error:", error);

    return res.status(500).json({
      message: "Unable to fetch tickets.",
    });
  }
};

// GET /api/admin/tickets/:id
export const getAdminTicketById = async (req, res) => {
  try {
    const ticketResult = await pool.query(
      `
        SELECT
          t.*,
          u.full_name AS author_name,
          u.email AS author_email,
          u.phone AS author_phone,
          b.title AS book_title,
          b.isbn,
          ts.name AS status,
          tc.name AS category,
          tp.name AS priority,
          assignee.full_name AS assignee_name
        FROM tickets t
        JOIN users u ON u.id = t.author_id
        LEFT JOIN books b ON b.id = t.book_id
        JOIN ticket_statuses ts ON ts.id = t.status_id
        JOIN ticket_categories tc ON tc.id = t.category_id
        JOIN ticket_priorities tp ON tp.id = t.priority_id
        LEFT JOIN users assignee ON assignee.id = t.assigned_to
        WHERE t.id = $1
      `,
      [req.params.id]
    );

    if (ticketResult.rowCount === 0) {
      return res.status(404).json({
        message: "Ticket not found.",
      });
    }

    const ticket = ticketResult.rows[0];

    const [messagesResult, historyResult, assessmentsResult] =
      await Promise.all([
        pool.query(
          `
            SELECT
              tm.id,
              tm.sender_id,
              u.full_name AS sender_name,
              u.role AS sender_role,
              tm.message_type,
              tm.body,
              tm.created_at,
              tm.edited_at
            FROM ticket_messages tm
            JOIN users u ON u.id = tm.sender_id
            WHERE tm.ticket_id = $1
            ORDER BY tm.created_at ASC, tm.id ASC
          `,
          [req.params.id]
        ),

        pool.query(
          `
            SELECT
              h.id,
              old_status.name AS old_status,
              new_status.name AS new_status,
              h.note,
              h.changed_at,
              u.full_name AS changed_by_name
            FROM ticket_status_history h
            LEFT JOIN ticket_statuses old_status
              ON old_status.id = h.old_status_id
            JOIN ticket_statuses new_status
              ON new_status.id = h.new_status_id
            LEFT JOIN users u ON u.id = h.changed_by
            WHERE h.ticket_id = $1
            ORDER BY h.changed_at DESC
          `,
          [req.params.id]
        ),

        pool.query(
          `
            SELECT
              id,
              suggested_category_id,
              suggested_priority_id,
              category_confidence,
              priority_confidence,
              reasoning,
              response_draft,
              model_name,
              accepted,
              created_at
            FROM ticket_ai_assessments
            WHERE ticket_id = $1
            ORDER BY created_at DESC
            LIMIT 5
          `,
          [req.params.id]
        ),
      ]);

    return res.status(200).json({
      ticket,
      messages: messagesResult.rows,
      statusHistory: historyResult.rows,
      aiAssessments: assessmentsResult.rows,
    });
  } catch (error) {
    console.error("Get admin ticket details error:", error);

    return res.status(500).json({
      message: "Unable to fetch ticket details.",
    });
  }
};

// PATCH /api/admin/tickets/:id/status
export const updateAdminTicketStatus = async (req, res) => {
  const { status, note } = req.body;

  if (typeof status !== "string" || !status.trim()) {
    return res.status(400).json({
      message: "A valid status is required.",
    });
  }

  if (note !== undefined && typeof note !== "string") {
    return res.status(400).json({
      message: "Note must be a string.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const ticketResult = await client.query(
      `
        SELECT t.id, t.status_id, ts.name AS old_status
        FROM tickets t
        JOIN ticket_statuses ts ON ts.id = t.status_id
        WHERE t.id = $1
        FOR UPDATE OF t
      `,
      [req.params.id]
    );

    if (ticketResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Ticket not found.",
      });
    }

    const statusResult = await client.query(
      `
        SELECT id, name, is_closed
        FROM ticket_statuses
        WHERE LOWER(name) = LOWER($1)
      `,
      [status.trim()]
    );

    if (statusResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Invalid ticket status.",
        allowed: ["Open", "In Progress", "Resolved", "Closed"],
      });
    }

    const ticket = ticketResult.rows[0];
    const newStatus = statusResult.rows[0];

    if (ticket.status_id === newStatus.id) {
      await client.query("COMMIT");

      return res.status(200).json({
        message: "Ticket already has this status.",
        status: newStatus.name,
      });
    }

    await client.query(
      `
        UPDATE tickets
        SET
          status_id = $1,
          resolved_at = CASE
            WHEN $2 = 'Resolved' THEN COALESCE(resolved_at, NOW())
            WHEN $2 = 'Open' OR $2 = 'In Progress' THEN NULL
            ELSE resolved_at
          END,
          closed_at = CASE
            WHEN $2 = 'Closed' THEN COALESCE(closed_at, NOW())
            WHEN $2 <> 'Closed' THEN NULL
            ELSE closed_at
          END
        WHERE id = $3
      `,
      [newStatus.id, newStatus.name, req.params.id]
    );

    await client.query(
      `
        INSERT INTO ticket_status_history (
          ticket_id,
          changed_by,
          old_status_id,
          new_status_id,
          note
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        req.params.id,
        req.user.id,
        ticket.status_id,
        newStatus.id,
        note?.trim() || null,
      ]
    );

    await client.query(
      `
        INSERT INTO ticket_messages (
          ticket_id,
          sender_id,
          message_type,
          body
        )
        VALUES ($1, $2, 'system_event', $3)
      `,
      [
        req.params.id,
        req.user.id,
        `Ticket status changed from ${ticket.old_status} to ${newStatus.name}.`,
      ]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      message: "Ticket status updated successfully.",
      status: newStatus.name,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Update ticket status error:", error);

    return res.status(500).json({
      message: "Unable to update ticket status.",
    });
  } finally {
    client.release();
  }
};

// PATCH /api/admin/tickets/:id/priority
export const updateAdminTicketPriority = async (req, res) => {
  try {
    const { priority } = req.body;

    if (typeof priority !== "string" || !priority.trim()) {
      return res.status(400).json({
        message: "Priority is required.",
      });
    }

    const result = await pool.query(
      `
        UPDATE tickets t
        SET priority_id = tp.id
        FROM ticket_priorities tp
        WHERE t.id = $1
          AND LOWER(tp.name) = LOWER($2)
        RETURNING t.id, tp.name AS priority
      `,
      [req.params.id, priority.trim()]
    );

    if (result.rowCount === 0) {
      const ticketExists = await pool.query(
        "SELECT id FROM tickets WHERE id = $1",
        [req.params.id]
      );

      if (ticketExists.rowCount === 0) {
        return res.status(404).json({
          message: "Ticket not found.",
        });
      }

      return res.status(400).json({
        message: "Invalid priority.",
        allowed: ["Critical", "High", "Medium", "Low"],
      });
    }

    return res.status(200).json({
      message: "Ticket priority updated successfully.",
      ticket: result.rows[0],
    });
  } catch (error) {
    console.error("Update ticket priority error:", error);

    return res.status(500).json({
      message: "Unable to update ticket priority.",
    });
  }
};

// PATCH /api/admin/tickets/:id/category
export const updateAdminTicketCategory = async (req, res) => {
  try {
    const { category } = req.body;

    if (typeof category !== "string" || !category.trim()) {
      return res.status(400).json({
        message: "Category is required.",
      });
    }

    const result = await pool.query(
      `
        UPDATE tickets t
        SET category_id = tc.id
        FROM ticket_categories tc
        WHERE t.id = $1
          AND LOWER(tc.name) = LOWER($2)
        RETURNING t.id, tc.name AS category
      `,
      [req.params.id, category.trim()]
    );

    if (result.rowCount === 0) {
      const ticketExists = await pool.query(
        "SELECT id FROM tickets WHERE id = $1",
        [req.params.id]
      );

      if (ticketExists.rowCount === 0) {
        return res.status(404).json({
          message: "Ticket not found.",
        });
      }

      return res.status(400).json({
        message: "Invalid category.",
        allowed: [
          "Royalty & Payments",
          "ISBN & Metadata Issues",
          "Printing & Quality",
          "Distribution & Availability",
          "Book Status & Production Updates",
          "General Inquiry",
        ],
      });
    }

    return res.status(200).json({
      message: "Ticket category updated successfully.",
      ticket: result.rows[0],
    });
  } catch (error) {
    console.error("Update ticket category error:", error);

    return res.status(500).json({
      message: "Unable to update ticket category.",
    });
  }
};

// PATCH /api/admin/tickets/:id/assign
export const assignAdminTicket = async (req, res) => {
  try {
    const { assigneeId } = req.body;

    if (
      assigneeId !== null &&
      (typeof assigneeId !== "string" || !assigneeId.trim())
    ) {
      return res.status(400).json({
        message: "assigneeId must be a valid user ID or null.",
      });
    }

    const ticketExists = await pool.query(
      "SELECT id FROM tickets WHERE id = $1",
      [req.params.id]
    );

    if (ticketExists.rowCount === 0) {
      return res.status(404).json({
        message: "Ticket not found.",
      });
    }

    if (assigneeId !== null) {
      const assigneeResult = await pool.query(
        `
          SELECT id, full_name, role
          FROM users
          WHERE id = $1
            AND is_active = TRUE
            AND role IN ('admin', 'support')
        `,
        [assigneeId]
      );

      if (assigneeResult.rowCount === 0) {
        return res.status(400).json({
          message: "Assignee must be an active admin or support user.",
        });
      }
    }

    const result = await pool.query(
      `
        UPDATE tickets
        SET assigned_to = $1
        WHERE id = $2
        RETURNING id, assigned_to
      `,
      [assigneeId, req.params.id]
    );

    return res.status(200).json({
      message: assigneeId
        ? "Ticket assigned successfully."
        : "Ticket unassigned successfully.",
      ticket: result.rows[0],
    });
  } catch (error) {
    console.error("Assign ticket error:", error);

    return res.status(500).json({
      message: "Unable to assign ticket.",
    });
  }
};

// POST /api/admin/tickets/:id/notes
export const createAdminTicketNote = async (req, res) => {
  try {
    const body =
      typeof req.body.body === "string" ? req.body.body.trim() : "";

    if (!body) {
      return res.status(400).json({
        message: "Internal note cannot be empty.",
      });
    }

    const result = await pool.query(
      `
        INSERT INTO ticket_messages (
          ticket_id,
          sender_id,
          message_type,
          body
        )
        SELECT t.id, $2, 'internal_note', $3
        FROM tickets t
        WHERE t.id = $1
        RETURNING
          id,
          ticket_id,
          sender_id,
          message_type,
          body,
          created_at
      `,
      [req.params.id, req.user.id, body]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Ticket not found.",
      });
    }

    return res.status(201).json({
      message: "Internal note added successfully.",
      note: result.rows[0],
    });
  } catch (error) {
    console.error("Create internal note error:", error);

    return res.status(500).json({
      message: "Unable to add internal note.",
    });
  }
};

// Send a public reply to the author
export const replyToAdminTicket = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { body } = req.body;

    if (typeof body !== "string" || !body.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reply message is required.",
      });
    }

    if (body.trim().length > 10000) {
      return res.status(400).json({
        success: false,
        message: "Reply cannot exceed 10,000 characters.",
      });
    }

    await client.query("BEGIN");

    const ticketResult = await client.query(
      `
      SELECT t.id, t.status_id, ts.name AS status
      FROM tickets t
      JOIN ticket_statuses ts ON ts.id = t.status_id
      WHERE t.id = $1
      FOR UPDATE OF t
      `,
      [id]
    );

    if (!ticketResult.rows.length) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Ticket not found.",
      });
    }

    const ticket = ticketResult.rows[0];

    if (["Resolved", "Closed"].includes(ticket.status)) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "Reopen the ticket before replying.",
      });
    }

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
      [id, req.user.id, body.trim()]
    );

    await client.query(
      `
      UPDATE tickets
      SET last_message_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      `,
      [id]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Reply sent successfully.",
      data: messageResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Admin ticket reply error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send the reply.",
    });
  } finally {
    client.release();
  }
};