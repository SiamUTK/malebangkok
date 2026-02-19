require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const hpp = require("hpp");
const xssSanitizer = require("express-xss-sanitizer");

const { checkDatabaseConnection } = require("./config/db");
const logger = require("./config/logger");
const { getHealth } = require("./controllers/healthController");
const authRoutes = require("./routes/authRoutes");
const guideRoutes = require("./routes/guideRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { requestLogger } = require("./middleware/requestLogger");
const { globalLimiter, authLimiter, adminLimiter } = require("./middleware/rateLimiter");
const { notFound, errorHandler, AppError } = require("./middleware/errorMiddleware");

const app = express();
const port = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

const requiredEnv = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "JWT_SECRET"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnv.join(", ")}`);
}

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(requestLogger);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
      },
    },
    crossOriginResourcePolicy: { policy: "same-site" },
    referrerPolicy: { policy: "no-referrer" },
    hsts: isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.length === 0 && !isProduction) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new AppError("CORS origin is not allowed", 403));
    },
    credentials: true,
  })
);

app.use(globalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/admin", adminLimiter);
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(hpp());
app.use(xssSanitizer());
app.get("/api/health", getHealth);

app.use("/api/auth", authRoutes);
app.use("/api/guides", guideRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);

const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

app.get("/{*path}", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }

  return res.sendFile(path.join(publicDir, "index.html"), (error) => {
    if (error) {
      next();
    }
  });
});

app.use(notFound);
app.use(errorHandler);

app.listen(port, async () => {
  try {
    await checkDatabaseConnection();
    logger.info("server_started", { port, environment: nodeEnv });
  } catch (error) {
    logger.error("database_check_failed", { message: error.message });
  }
});
