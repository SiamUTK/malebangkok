const jwt = require("jsonwebtoken");
const { getAuthUserById } = require("../models/userModel");

const JWT_ALLOWED_ALGORITHMS = ["HS256"];

function extractBearerToken(authHeader) {
  if (!authHeader || typeof authHeader !== "string") {
    return null;
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  const token = parts[1];
  const segments = token.split(".");
  if (segments.length !== 3 || segments.some((segment) => segment.length === 0)) {
    return null;
  }

  return token;
}

async function authMiddleware(req, res, next) {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: missing token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: JWT_ALLOWED_ALGORITHMS,
      ignoreExpiration: false,
    });

    if (!payload || typeof payload.id !== "number") {
      return res.status(401).json({ message: "Unauthorized: invalid token" });
    }

    const authUser = await getAuthUserById(payload.id);

    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized: invalid token" });
    }

    if (!authUser.is_active) {
      return res.status(403).json({ message: "Account is disabled" });
    }

    req.user = {
      id: authUser.id,
      email: authUser.email,
      role: authUser.role,
      isActive: Boolean(authUser.is_active),
    };

    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Unauthorized: token expired" });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Unauthorized: invalid token" });
    }

    return res.status(401).json({ message: "Unauthorized: invalid token" });
  }
}

module.exports = {
  authMiddleware,
};
