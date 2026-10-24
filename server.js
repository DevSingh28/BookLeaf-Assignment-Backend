import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pool from "./config/db.js";

import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import booksRoutes from "./routes/books.routes.js";
import ticketsRoutes from "./routes/tickets.routes.js";
import ticketMessagesRoutes from "./routes/ticketMessages.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import knowledgeBaseRoutes from "./routes/knowledgeBase.routes.js";
import adminDashboardRoutes from "./routes/adminDashboard.routes.js";
import ticketAIRoutes from "./routes/ticketAI.routes.js";
import adminTicketsRoutes from "./routes/adminTickets.routes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.status(200).end();
});

app.get("/api/health", async (req, res, next) => {
  try {
    const result = await pool.query("SELECT NOW() AS database_time");

    res.status(200).json({
      success: true,
      message: "Database connection successful",
      databaseTime: result.rows[0].database_time,
    });
  } catch (error) {
    next(error);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/books", booksRoutes);
app.use("/api/tickets", ticketsRoutes);
app.use("/api/tickets", ticketMessagesRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/knowledge-base", knowledgeBaseRoutes);
app.use("/api/admin", adminDashboardRoutes);
app.use("/api/admin", ticketAIRoutes);
app.use("/api/admin", adminTicketsRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

app.use((error, req, res, next) => {
  console.error(error);

  res.status(error.status || 500).json({
    success: false,
    message:
      error.status && error.status < 500
        ? error.message
        : "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await pool.query("SELECT 1");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    await pool.end();
    process.exit(1);
  }
};

startServer();