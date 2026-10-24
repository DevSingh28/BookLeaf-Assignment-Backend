import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

const COOKIE_NAME = "bookleaf_token";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
};

const createToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_TOKEN_SECRET,
    { expiresIn: "1d" }
  );
};

const sendAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: 24 * 60 * 60 * 1000,
  });
};

const getPublicUser = (user) => ({
  id: user.id,
  fullName: user.full_name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isActive: user.is_active,
  emailVerifiedAt: user.email_verified_at,
  lastLoginAt: user.last_login_at,
  authorProfile: user.author_profile
    ? {
        city: user.author_profile.city,
        joinedDate: user.author_profile.joined_date,
      }
    : null,
});

// POST /api/auth/signup
export const signup = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { fullName, email, password, phone } = req.body;

    if (
      typeof fullName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and password are required.",
      });
    }

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedName.length < 2 || normalizedName.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Full name must be between 2 and 150 characters.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 8 and 72 characters.",
      });
    }

    if (
      phone !== undefined &&
      phone !== null &&
      (typeof phone !== "string" || phone.trim().length > 30)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phone number.",
      });
    }

    await client.query("BEGIN");

    // Never allow public signup to create an admin account or claim
    // a seeded author's account.
    const existingUser = await client.query(
      `SELECT id
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1
       FOR UPDATE`,
      [normalizedEmail]
    );

    if (existingUser.rowCount > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists. Please log in or contact support.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const userResult = await client.query(
      `INSERT INTO users (
         full_name,
         email,
         phone,
         role,
         password_hash,
         is_active
       )
       VALUES ($1, $2, $3, 'author', $4, TRUE)
       RETURNING
         id,
         full_name,
         email,
         phone,
         role,
         is_active,
         email_verified_at,
         last_login_at`,
      [
        normalizedName,
        normalizedEmail,
        phone?.trim() || null,
        passwordHash,
      ]
    );

    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO author_profiles (user_id)
       VALUES ($1)`,
      [user.id]
    );

    await client.query("COMMIT");

    // New users must log in separately if email verification or
    // other account approval is required by the final application.
    return res.status(201).json({
      success: true,
      message: "Account created successfully. Please log in.",
      user: getPublicUser(user),
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    next(error);
  } finally {
    client.release();
  }
};

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `SELECT
         u.id,
         u.full_name,
         u.email,
         u.phone,
         u.role,
         u.password_hash,
         u.is_active,
         u.email_verified_at,
         u.last_login_at,
         ap.city,
         ap.joined_date
       FROM users u
       LEFT JOIN author_profiles ap ON ap.user_id = u.id
       WHERE LOWER(u.email) = $1
       LIMIT 1`,
      [normalizedEmail]
    );

    const user = result.rows[0];

    // Use a generic error so the endpoint does not reveal whether
    // a particular email is registered.
    if (
      !user ||
      !user.password_hash ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "This account is inactive. Please contact support.",
      });
    }

    const updatedResult = await pool.query(
      `UPDATE users
       SET last_login_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING
         id,
         full_name,
         email,
         phone,
         role,
         is_active,
         email_verified_at,
         last_login_at`,
      [user.id]
    );

    const updatedUser = {
      ...updatedResult.rows[0],
      author_profile:
        user.role === "author"
          ? {
              city: user.city,
              joined_date: user.joined_date,
            }
          : null,
    };

    const token = createToken(updatedUser);

    sendAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: getPublicUser(updatedUser),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
export const logout = (req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions);

  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
};

// GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         u.id,
         u.full_name,
         u.email,
         u.phone,
         u.role,
         u.is_active,
         u.email_verified_at,
         u.last_login_at,
         ap.city,
         ap.joined_date
       FROM users u
       LEFT JOIN author_profiles ap ON ap.user_id = u.id
       WHERE u.id = $1
       LIMIT 1`,
      [req.user.id]
    );

    const user = result.rows[0];

    if (!user || !user.is_active) {
      res.clearCookie(COOKIE_NAME, cookieOptions);

      return res.status(401).json({
        success: false,
        message: "Your session is no longer valid. Please log in again.",
      });
    }

    return res.status(200).json({
      success: true,
      user: getPublicUser({
        ...user,
        author_profile:
          user.role === "author"
            ? {
                city: user.city,
                joined_date: user.joined_date,
              }
            : null,
      }),
    });
  } catch (error) {
    next(error);
  }
};
