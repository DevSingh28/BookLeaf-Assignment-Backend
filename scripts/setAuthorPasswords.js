import bcrypt from "bcryptjs";
import pool from "../config/db.js";

const DEFAULT_PASSWORD = "Author@123";

async function setAuthorPasswords() {
  try {
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

    const result = await pool.query(
      `
        UPDATE users
        SET password_hash = $1
        WHERE role = 'author'
          AND password_hash IS NULL
        RETURNING id, full_name, email
      `,
      [passwordHash]
    );

    console.log(`Updated ${result.rowCount} author accounts.`);

    result.rows.forEach((user) => {
      console.log(`${user.full_name}: ${user.email}`);
    });
  } catch (error) {
    console.error("Failed to set author passwords:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

setAuthorPasswords();