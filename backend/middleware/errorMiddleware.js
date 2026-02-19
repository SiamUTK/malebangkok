const logger = require("../config/logger");

class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

function notFound(req, res) {
  res.status(404).json({
    message: "Resource not found",
    requestId: req.requestId || null,
  });
}

function errorHandler(err, req, res, next) {
  const statusCode =
    err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  // 🔥 DEBUG MODE: แสดง error จริงทั้งหมด
  console.error("==== ERROR START ====");
  console.error("Request ID:", req.requestId);
  console.error("Path:", req.originalUrl);
  console.error("Method:", req.method);
  console.error("Message:", err.message);
  console.error("Stack:", err.stack);
  console.error("Details:", err.details);
  console.error("==== ERROR END ====");

  logger.error("Request failed", {
    requestId: req.requestId,
    message: err.message,
    path: req.originalUrl,
    method: req.method,
    statusCode,
    stack: err.stack,
    details: err.details || null,
  });

  res.status(statusCode).json({
    message: err.message || "Internal server error",
    requestId: req.requestId || null,
    details: err.details || null,
    stack: err.stack || null,
  });
}

module.exports = {
  AppError,
  notFound,
  errorHandler,
};
