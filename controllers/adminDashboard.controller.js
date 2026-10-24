import pool from "../config/db.js";

export const getAdminDashboard = async (req, res, next) => {
  try {
    const [statsResult, recentTicketsResult, activityResult, categoriesResult] =
      await Promise.all([
        pool.query(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE LOWER(ts.name) = 'open')::int AS open,
            COUNT(*) FILTER (WHERE LOWER(ts.name) = 'in progress')::int AS in_progress,
            COUNT(*) FILTER (WHERE LOWER(ts.name) IN ('resolved', 'closed'))::int AS resolved,
            COUNT(*) FILTER (
              WHERE t.created_at <= NOW() - INTERVAL '24 hours'
                AND LOWER(ts.name) NOT IN ('resolved', 'closed')
            )::int AS overdue,
            CASE
              WHEN COUNT(*) = 0 THEN 0
              ELSE ROUND(
                COUNT(*) FILTER (WHERE LOWER(ts.name) IN ('resolved', 'closed'))::numeric
                * 100 / COUNT(*),
                1
              )
            END AS resolution_rate
          FROM tickets t
          JOIN ticket_statuses ts ON ts.id = t.status_id
        `),
        pool.query(`
          SELECT
            t.id,
            t.ticket_number,
            t.subject,
            t.description,
            t.created_at,
            t.updated_at,
            t.last_message_at,
            u.full_name AS author_name,
            u.email AS author_email,
            tc.name AS category,
            ts.name AS status,
            tp.name AS priority,
            assignee.id AS assigned_to,
            assignee.full_name AS assignee_name,
            b.title AS book_title
          FROM tickets t
          JOIN users u ON u.id = t.author_id
          JOIN ticket_statuses ts ON ts.id = t.status_id
          JOIN ticket_categories tc ON tc.id = t.category_id
          JOIN ticket_priorities tp ON tp.id = t.priority_id
          LEFT JOIN users assignee ON assignee.id = t.assigned_to
          LEFT JOIN books b ON b.id = t.book_id
          ORDER BY COALESCE(t.last_message_at, t.updated_at, t.created_at) DESC
          LIMIT 10
        `),
        pool.query(`
          SELECT
            TO_CHAR(days.day, 'YYYY-MM-DD') AS date,
            TO_CHAR(days.day, 'Dy') AS day,
            COUNT(t.id)::int AS created,
            COUNT(t.id) FILTER (
              WHERE LOWER(ts.name) IN ('resolved', 'closed')
            )::int AS resolved
          FROM generate_series(
            CURRENT_DATE - INTERVAL '6 days',
            CURRENT_DATE,
            INTERVAL '1 day'
          ) AS days(day)
          LEFT JOIN tickets t
            ON t.created_at >= days.day
           AND t.created_at < days.day + INTERVAL '1 day'
          LEFT JOIN ticket_statuses ts ON ts.id = t.status_id
          GROUP BY days.day
          ORDER BY days.day
        `),
        pool.query(`
          SELECT tc.name AS name, COUNT(t.id)::int AS count
          FROM ticket_categories tc
          LEFT JOIN tickets t ON t.category_id = tc.id
          GROUP BY tc.id, tc.name
          ORDER BY count DESC, tc.name ASC
        `),
      ]);

    const statsRow = statsResult.rows[0];
    const responseTimeResult = await pool.query(`
      SELECT AVG(EXTRACT(EPOCH FROM (first_reply.created_at - t.created_at)) / 3600) AS average_hours
      FROM tickets t
      JOIN LATERAL (
        SELECT MIN(tm.created_at) AS created_at
        FROM ticket_messages tm
        JOIN users responder ON responder.id = tm.sender_id
        WHERE tm.ticket_id = t.id
          AND tm.message_type = 'reply'
          AND responder.role IN ('admin', 'support')
      ) first_reply ON first_reply.created_at IS NOT NULL
    `);

    const averageHours = responseTimeResult.rows[0]?.average_hours;
    const avgResponse = averageHours == null
      ? "—"
      : Number(averageHours) < 1
        ? `${Math.max(1, Math.round(Number(averageHours) * 60))}m`
        : `${Number(averageHours).toFixed(1)}h`;

    const stats = {
      total: Number(statsRow.total),
      open: Number(statsRow.open),
      inProgress: Number(statsRow.in_progress),
      resolved: Number(statsRow.resolved),
      overdue: Number(statsRow.overdue),
      avgResponse,
      resolutionRate: Number(statsRow.resolution_rate),
    };

    return res.status(200).json({
      success: true,
      data: {
        dashboard: stats,
        stats,
        recentTickets: recentTicketsResult.rows,
        weeklyActivity: activityResult.rows,
        categoryData: categoriesResult.rows,
      },
    });
  } catch (error) {
    console.error("Get admin dashboard error:", error);
    return next(error);
  }
};
