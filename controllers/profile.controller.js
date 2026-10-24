// controllers/profile.controller.js

import pool from "../config/db.js";

// GET /api/profile
export const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.phone,
          u.role,
          u.created_at,
          ap.city,
          ap.joined_date
        FROM users u
        LEFT JOIN author_profiles ap ON ap.user_id = u.id
        WHERE u.id = $1
          AND u.is_active = TRUE
      `,
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Profile not found.",
      });
    }

    return res.status(200).json({
      profile: result.rows[0],
    });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      message: "Unable to fetch profile.",
    });
  }
};

// PATCH /api/profile
export const updateProfile = async (req, res) => {
  const { fullName, phone, city } = req.body;

  if (
    fullName !== undefined &&
    (typeof fullName !== "string" ||
      fullName.trim().length < 2 ||
      fullName.trim().length > 160)
  ) {
    return res.status(400).json({
      message: "Full name must contain between 2 and 160 characters.",
    });
  }

  if (
    phone !== undefined &&
    phone !== null &&
    (typeof phone !== "string" || phone.trim().length > 40)
  ) {
    return res.status(400).json({
      message: "Please provide a valid phone number.",
    });
  }

  if (
    city !== undefined &&
    city !== null &&
    (typeof city !== "string" || city.trim().length > 120)
  ) {
    return res.status(400).json({
      message: "City must not exceed 120 characters.",
    });
  }

  if (
    fullName === undefined &&
    phone === undefined &&
    city === undefined
  ) {
    return res.status(400).json({
      message: "Provide at least one field to update.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
        UPDATE users
        SET
          full_name = COALESCE($1, full_name),
          phone = CASE
            WHEN $2::boolean THEN $3
            ELSE phone
          END
        WHERE id = $4
          AND is_active = TRUE
        RETURNING id
      `,
      [
        fullName === undefined ? null : fullName.trim(),
        phone !== undefined,
        phone === undefined ? null : phone?.trim() || null,
        req.user.id,
      ]
    );

    if (userResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Profile not found.",
      });
    }

    // Profile settings are available only to author accounts.
    if (req.user.role === "author" && city !== undefined) {
      await client.query(
        `
          INSERT INTO author_profiles (user_id, city)
          VALUES ($1, $2)
          ON CONFLICT (user_id)
          DO UPDATE SET city = EXCLUDED.city
        `,
        [req.user.id, city?.trim() || null]
      );
    }

    await client.query("COMMIT");

    const updatedProfile = await pool.query(
      `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.phone,
          u.role,
          u.created_at,
          ap.city,
          ap.joined_date
        FROM users u
        LEFT JOIN author_profiles ap ON ap.user_id = u.id
        WHERE u.id = $1
      `,
      [req.user.id]
    );

    return res.status(200).json({
      message: "Profile updated successfully.",
      profile: updatedProfile.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Update profile error:", error);

    return res.status(500).json({
      message: "Unable to update profile.",
    });
  } finally {
    client.release();
  }
};