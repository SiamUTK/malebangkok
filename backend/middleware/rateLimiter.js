const rateLimit = require("express-rate-limit");

const WINDOW_MS = 15 * 60 * 1000;

function getRetryAfterSeconds(req) {
  const resetTime = req.rateLimit?.resetTime;
  if (!resetTime) {
    return null;
  }

  const diffMs = resetTime.getTime() - Date.now();
  return diffMs > 0 ? Math.ceil(diffMs / 1000) : 0;
}

const baseConfig = {
  windowMs: WINDOW_MS,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many requests",
      retryAfter: getRetryAfterSeconds(req),
    });
  },
};

const globalLimiter = rateLimit({
  ...baseConfig,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  skip: (req) => req.path === "/api/health",
});

const authLimiter = rateLimit({
  ...baseConfig,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX) || 5,
});

const adminLimiter = rateLimit({
  ...baseConfig,
  max: Number(process.env.RATE_LIMIT_ADMIN_MAX) || 50,
});

const bookingLimiter = rateLimit({
  ...baseConfig,
  max: Number(process.env.RATE_LIMIT_BOOKING_MAX) || 30,
});

const paymentLimiter = rateLimit({
  ...baseConfig,
  max: Number(process.env.RATE_LIMIT_PAYMENT_MAX) || 20,
});

const loginLimiter = authLimiter;

module.exports = {
  globalLimiter,
  authLimiter,
  adminLimiter,
  loginLimiter,
  bookingLimiter,
  paymentLimiter,
};