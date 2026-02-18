require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { v4: uuidv4 } = require("uuid");

const { checkDatabaseConnection } = require("./config/db");
const logger = require("./config/logger");
const authRoutes = require("./routes/authRoutes");
const guideRoutes = require("./routes/guideRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { globalLimiter } = require("./middleware/rateLimiter");
const { notFound, errorHandler, AppError } = require("./middleware/errorMiddleware");

const app = express();
const port = Number(process.env.PORT) || 5000;
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

app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
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
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info("http_request", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip,
      userAgent: req.get("user-agent") || null,
      userId: req.user?.id || null,
    });
  });
  next();
});

app.get("/api/health", async (req, res, next) => {
  try {
    await checkDatabaseConnection();
    res.status(200).json({
      status: "ok",
      service: "malebangkok-api",
      environment: nodeEnv,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/guides", guideRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);

const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

app.get("*", (req, res, next) => {
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
