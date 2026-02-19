const logger = require("../config/logger");

async function sendCriticalAlert(errorPayload) {
  try {
    logger.warn("critical_error_alert", {
      event: "critical_alert",
      alertVersion: 1,
      channel: process.env.ALERT_CHANNEL || "log-only",
      service: "malebangkok-api",
      createdAt: new Date().toISOString(),
      payload: {
        requestId: errorPayload?.requestId || null,
        statusCode: errorPayload?.statusCode || 500,
        method: errorPayload?.method || null,
        path: errorPayload?.path || null,
        message: errorPayload?.message || "Unknown server error",
        userId: errorPayload?.userId || null,
        ip: errorPayload?.ip || null,
      },
      integration: {
        provider: "webhook",
        enabled: false,
      },
    });
  } catch (error) {
    logger.error("critical_error_alert_logging_failed", {
      message: error.message,
    });
  }
}

module.exports = {
  sendCriticalAlert,
};
