const { verifyAccessToken } = require("../utils/tokenUtils");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: missing token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized: invalid token" });
  }
}

module.exports = {
  authMiddleware,
};
