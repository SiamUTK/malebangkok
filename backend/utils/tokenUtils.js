const jwt = require("jsonwebtoken");

const JWT_EXPIRES_IN = "7d";

function buildTokenPayload(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

function signAccessToken(user) {
  return jwt.sign(buildTokenPayload(user), process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
};
