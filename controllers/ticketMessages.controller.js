// controllers/ticketMessages.controller.js

import pool from "../config/db.js";
import { getPagination } from "../utils/pagination.js";

const getUserRole = (role) => role?.toLowerCase();

// GET /api/tickets/:id/messages?page=1&limit=20
export const getTicketMessages = async (req, res) => {
  try {
    const { id: ticketId } = req.params;
    const userId = req.user.id;
    const role = req.user.role?.toLowerCase();

    const pagination = getPagination(req.query);

    if (pagination.error) {
      return res.status(400).json({
        message: pagination.error,
      });
    }

    const { page, limit, offset } = pagination;

    let ticketQuery = `
      SELECT id
      FROM tickets
      WHERE id = $1
    `;

    const ticketValues = [ticketId];

    if (role !== "admin") {
      ticketQuery += ` AND author_id = $2`;
      ticketValues.push(userId);
    }

    const ticketResult = await pool.query(ticketQuery, ticketValues);

    if (ticketResult.rowCount === 0) {
      return res.status(404).json({
        message: "Ticket not found.",
      });
    }

    const messageFilter =
      role === "admin"
        ? ""
        : " AND tm.message_type <> 'internal_note'";

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM ticket_messages tm
      WHERE tm.ticket_id = $1
      ${messageFilter}
    `;

    const countResult = await pool.query(countQuery, [ticketId]);
    const total = countResult.rows[0].total;

    const messagesQuery = `
      SELECT
        tm.id,
        tm.ticket_id,
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
      ${messageFilter}
      ORDER BY tm.created_at ASC, tm.id ASC
      LIMIT $2 OFFSET $3
    `;

    const messagesResult = await pool.query(messagesQuery, [
      ticketId,
      limit,
      offset,
    ]);

    return res.status(200).json({
      messages: messagesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get ticket messages error:", error);

    return res.status(500).json({
      message: "Unable to fetch ticket messages.",
    });
  }
};

// POST /api/tickets/:id/messages
export const createTicketMessage = async (req, res) => {
  try {
    const { id: ticketId } = req.params;
    const userId = req.user.id;
    const role = getUserRole(req.user.role);

    const body =
      typeof req.body.body === "string" ? req.body.body.trim() : "";

    if (!body) {
      return res.status(400).json({
        message: "Message body is required.",
      });
    }

    // Authors can only reply to their own tickets.
    // Admins can reply to any ticket.
    let ticketQuery = `
      SELECT
        t.id,
        ts.name AS status
      FROM tickets t
      JOIN ticket_statuses ts ON ts.id = t.status_id
      WHERE t.id = $1
    `;

    const ticketValues = [ticketId];

    if (role !== "admin") {
      ticketQuery += ` AND t.author_id = $2`;
      ticketValues.push(userId);
    }

    const ticketResult = await pool.query(ticketQuery, ticketValues);

    if (ticketResult.rowCount === 0) {
      return res.status(404).json({
        message: "Ticket not found.",
      });
    }

    const ticket = ticketResult.rows[0];

    if (["Resolved", "Closed"].includes(ticket.status)) {
      return res.status(400).json({
        message:
          "This ticket is resolved or closed. Reopen it before adding a message.",
      });
    }

    // Authors can only create public replies.
    // Internal notes and system events must be created through
    // appropriate admin/system workflows.
    const messageType = "reply";

    const result = await pool.query(
      `
        INSERT INTO ticket_messages (
          ticket_id,
          sender_id,
          message_type,
          body
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          ticket_id,
          sender_id,
          message_type,
          body,
          created_at,
          edited_at
      `,
      [ticketId, userId, messageType, body]
    );

    return res.status(201).json({
      message: "Reply added successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create ticket message error:", error);

    return res.status(500).json({
      message: "Unable to add your reply.",
    });
  }
};