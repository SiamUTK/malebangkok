const logger = require("../config/logger");
const { sendCriticalAlert, sendHighAlert } = require("../services/alertService");

const ERROR_BURST_WINDOW_MS = Number(process.env.ERROR_BURST_WINDOW_MS) || 60 * 1000;
const ERROR_BURST_THRESHOLD = Number(process.env.ERROR_BURST_THRESHOLD) || 25;
const ERROR_BURST_ALERT_COOLDOWN_MS = Number(process.env.ERROR_BURST_ALERT_COOLDOWN_MS) || 5 * 60 * 1000;

const errorWindow = [];
let lastBurstAlertAt = 0;

function trackServerErrorBurst(requestContext) {
  const now = Date.now();
  errorWindow.push(now);

  while (errorWindow.length > 0 && now - errorWindow[0] > ERROR_BURST_WINDOW_MS) {
    errorWindow.shift();
  }

  if (
    errorWindow.length >= ERROR_BURST_THRESHOLD &&
    now - lastBurstAlertAt >= ERROR_BURST_ALERT_COOLDOWN_MS
  ) {
    lastBurstAlertAt = now;
    Promise.resolve(
      sendHighAlert({
        event: "high_error_rate_burst",
        title: "High API error rate detected",
        message: `5xx threshold exceeded: ${errorWindow.length} in ${ERROR_BURST_WINDOW_MS}ms`,
        path: requestContext.path,
        method: requestContext.method,
        requestId: requestContext.requestId,
      })
    ).catch(() => {});
  }
}

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
    trackServerErrorBurst({
      path: req.originalUrl,
      method: req.method,
      requestId: req.requestId || null,
    });

    const shouldEscalateCritical = !err.isOperational || statusCode >= 503;
    if (shouldEscalateCritical) {
      Promise.resolve(
        sendCriticalAlert({
          event: "http_server_error",
          title: "Server error response",
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

    if (!shouldEscalateCritical) {
      Promise.resolve(
        sendHighAlert({
          event: "http_operational_5xx",
          title: "Operational 5xx observed",
          requestId: req.requestId || null,
          statusCode,
          method: req.method,
          path: req.originalUrl,
          message: err.message,
        })
      ).catch(() => {});
    }
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
