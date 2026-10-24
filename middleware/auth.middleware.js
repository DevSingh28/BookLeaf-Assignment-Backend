
import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  const token = req.cookies?.bookleaf_token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please log in.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET, {
      algorithms: ["HS256"],
    });

    if (
      typeof decoded.id !== "string" ||
      !["author", "admin"].includes(decoded.role)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Your session has expired or is invalid. Please log in again.",
    });
  }
};