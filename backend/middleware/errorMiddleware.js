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
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const safeMessage = statusCode >= 500 && process.env.NODE_ENV === "production"
    ? "Internal server error"
    : err.message || "Internal server error";

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
    message: safeMessage,
    requestId: req.requestId || null,
    details: err.details || undefined,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
}

module.exports = {
  AppError,
  notFound,
  errorHandler,
};
