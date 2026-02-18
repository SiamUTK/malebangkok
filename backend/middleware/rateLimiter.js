const rateLimit = require("express-rate-limit");

const baseConfig = {
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/api/health",
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many requests, please try again later.",
      retryAfterSeconds: Math.ceil((req.rateLimit?.resetTime?.getTime() - Date.now()) / 1000) || null,
    });
  },
};

const globalLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 250,
});

const loginLimiter = rateLimit({
  ...baseConfig,
  windowMs: 10 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_LOGIN_MAX) || 10,
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many login attempts. Please try again later.",
      retryAfterSeconds: Math.ceil((req.rateLimit?.resetTime?.getTime() - Date.now()) / 1000) || null,
    });
  },
});

const bookingLimiter = rateLimit({
  ...baseConfig,
  windowMs: 10 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_BOOKING_MAX) || 30,
});

const paymentLimiter = rateLimit({
  ...baseConfig,
  windowMs: 10 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PAYMENT_MAX) || 20,
});

module.exports = {
  globalLimiter,
  loginLimiter,
  bookingLimiter,
  paymentLimiter,
};