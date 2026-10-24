import "dotenv/config";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";

const [fullNameArg, emailArg, passwordArg] = process.argv.slice(2);
const password = passwordArg || process.env.ADMIN_PASSWORD;

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (!fullNameArg || !emailArg || !password) {
  fail(
    'Usage: node scripts/createAdmin.js "<Full Name>" <email> <password>\n' +
      "The password can also be passed through the ADMIN_PASSWORD environment variable."
  );
}

const fullName = fullNameArg.trim();
const email = emailArg.trim().toLowerCase();

if (fullName.length < 2 || fullName.length > 150) {
  fail("Full name must be between 2 and 150 characters.");
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail("Please provide a valid email address.");
}

if (password.length < 8 || password.length > 72) {
  fail("Password must be between 8 and 72 characters.");
}

try {
  const existing = await pool.query(
    "SELECT id, role FROM users WHERE LOWER(email) = $1 LIMIT 1",
    [email]
  );

  if (existing.rowCount > 0) {
    fail(
      `A user with this email already exists (id: ${existing.rows[0].id}, role: ${existing.rows[0].role}).`
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `INSERT INTO users (full_name, email, role, password_hash, is_active)
     VALUES ($1, $2, 'admin', $3, TRUE)
     RETURNING id, full_name, email, role`,
    [fullName, email, passwordHash]
  );

  console.log("Admin created successfully:");
  console.log(result.rows[0]);
} catch (error) {
  console.error("Failed to create admin:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}