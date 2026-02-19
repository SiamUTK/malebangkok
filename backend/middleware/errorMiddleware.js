const logger = require("../config/logger");
const { sendCriticalAlert } = require("../services/alertService");

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
  const isProduction = (process.env.NODE_ENV || "development") === "production";
  const statusCode =
    err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  logger.error("Request failed", {
    requestId: req.requestId,
    message: err.message,
    path: req.originalUrl,
    method: req.method,
    statusCode,
    stack: err.stack,
    details: err.details || null,
  });

  if (statusCode >= 500) {
    Promise.resolve(
      sendCriticalAlert({
        requestId: req.requestId || null,
        statusCode,
        method: req.method,
        path: req.originalUrl,
        message: err.message,
        userId: req.user?.id || null,
        ip: req.ip || null,
      })
    ).catch((alertError) => {
      logger.error("critical_alert_dispatch_failed", {
        requestId: req.requestId || null,
        message: alertError.message,
      });
    });
  }

  if (!isProduction) {
    console.error("==== ERROR START ====");
    console.error("Request ID:", req.requestId);
    console.error("Path:", req.originalUrl);
    console.error("Method:", req.method);
    console.error("Message:", err.message);
    console.error("Stack:", err.stack);
    console.error("Details:", err.details);
    console.error("==== ERROR END ====");
  }

  res.status(statusCode).json({
    message: isProduction && statusCode >= 500 ? "Internal server error" : err.message || "Internal server error",
    requestId: req.requestId || null,
    details: isProduction ? null : err.details || null,
    stack: isProduction ? null : err.stack || null,
  });
}

module.exports = {
  AppError,
  notFound,
  errorHandler,
};
