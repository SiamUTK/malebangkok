const logger = require("../config/logger");

const ALERT_TRANSPORT = (process.env.ALERT_TRANSPORT || "log-only").toLowerCase();
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL || "";
const ALERT_REQUEST_TIMEOUT_MS = Number(process.env.ALERT_REQUEST_TIMEOUT_MS) || 4000;
const ALERT_MAX_RETRIES = Number(process.env.ALERT_MAX_RETRIES) || 2;
const ALERT_BACKOFF_BASE_MS = Number(process.env.ALERT_BACKOFF_BASE_MS) || 300;
const ALERT_RATE_LIMIT_WINDOW_MS = Number(process.env.ALERT_RATE_LIMIT_WINDOW_MS) || 5 * 60 * 1000;
const ALERT_RL_CRITICAL = Number(process.env.ALERT_RATE_LIMIT_CRITICAL) || 20;
const ALERT_RL_HIGH = Number(process.env.ALERT_RATE_LIMIT_HIGH) || 10;
const ALERT_RL_WARNING = Number(process.env.ALERT_RATE_LIMIT_WARNING) || 5;

const rateLimiterState = new Map();

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveRateLimitMax(severity) {
  if (severity === "critical") {
    return ALERT_RL_CRITICAL;
  }

  if (severity === "high") {
    return ALERT_RL_HIGH;
  }

  return ALERT_RL_WARNING;
}

function buildFingerprint(payload) {
  const scope = payload.path || payload.event || payload.code || "global";
  return `${payload.severity}:${scope}:${payload.title || payload.message || "alert"}`;
}

function allowByRateLimit(payload) {
  const now = Date.now();
  const fingerprint = buildFingerprint(payload);
  const maxEvents = resolveRateLimitMax(payload.severity);

  const state = rateLimiterState.get(fingerprint) || {
    startedAt: now,
    count: 0,
    suppressed: 0,
  };

  if (now - state.startedAt > ALERT_RATE_LIMIT_WINDOW_MS) {
    if (state.suppressed > 0) {
      logger.warn("alert_suppression_summary", {
        event: "alert_suppression_summary",
        fingerprint,
        suppressed: state.suppressed,
        windowMs: ALERT_RATE_LIMIT_WINDOW_MS,
      });
    }

    state.startedAt = now;
    state.count = 0;
    state.suppressed = 0;
  }

  state.count += 1;
  if (state.count > maxEvents) {
    state.suppressed += 1;
    rateLimiterState.set(fingerprint, state);
    return false;
  }

  rateLimiterState.set(fingerprint, state);
  return true;
}

function redactPayload(payload) {
  const clone = { ...payload };
  const forbiddenKeys = [
    "authorization",
    "token",
    "jwt",
    "password",
    "secret",
    "cardNumber",
    "cvv",
  ];

  Object.keys(clone).forEach((key) => {
    const lowerKey = key.toLowerCase();
    if (forbiddenKeys.some((forbiddenKey) => lowerKey.includes(forbiddenKey))) {
      clone[key] = "[REDACTED]";
    }
  });

  return clone;
}

function buildAlertPayload(severity, payload = {}) {
  const safePayload = redactPayload(payload);

  return {
    severity,
    event: safePayload.event || "application_alert",
    title: safePayload.title || safePayload.message || `MaleBangkok ${severity} alert`,
    message: safePayload.message || "No message provided",
    service: process.env.SERVICE_NAME || "malebangkok-api",
    environment: process.env.NODE_ENV || "production",
    requestId: safePayload.requestId || null,
    correlationId: safePayload.correlationId || safePayload.requestId || null,
    statusCode: safePayload.statusCode || null,
    method: safePayload.method || null,
    path: safePayload.path || null,
    code: safePayload.code || null,
    details: safePayload.details || null,
    timestamp: new Date().toISOString(),
  };
}

function toSlackMessage(alertPayload) {
  const color =
    alertPayload.severity === "critical"
      ? "#D92D20"
      : alertPayload.severity === "high"
      ? "#F79009"
      : "#1570EF";

  return {
    text: `[${alertPayload.severity.toUpperCase()}] ${alertPayload.title}`,
    attachments: [
      {
        color,
        fields: [
          { title: "Service", value: alertPayload.service, short: true },
          { title: "Environment", value: alertPayload.environment, short: true },
          { title: "Event", value: String(alertPayload.event || "-"), short: true },
          { title: "Status", value: String(alertPayload.statusCode || "-"), short: true },
          { title: "Path", value: String(alertPayload.path || "-"), short: false },
          { title: "Request ID", value: String(alertPayload.requestId || "-"), short: false },
          { title: "Message", value: String(alertPayload.message || "-"), short: false },
        ],
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

async function postSlack(message) {
  if (!ALERT_WEBHOOK_URL) {
    logger.debug("alert_transport_not_configured", {
      event: "alert_transport_not_configured",
      transport: ALERT_TRANSPORT,
    });
    return false;
  }

  for (let attempt = 0; attempt <= ALERT_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ALERT_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(ALERT_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return true;
      }

      const retryable = response.status >= 429 || response.status >= 500;
      if (!retryable || attempt === ALERT_MAX_RETRIES) {
        logger.warn("alert_transport_http_failure", {
          event: "alert_transport_http_failure",
          statusCode: response.status,
          attempt: attempt + 1,
        });
        return false;
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (attempt === ALERT_MAX_RETRIES) {
        logger.warn("alert_transport_request_failed", {
          event: "alert_transport_request_failed",
          message: error.message,
          attempt: attempt + 1,
        });
        return false;
      }
    }

    const backoffMs = ALERT_BACKOFF_BASE_MS * Math.pow(2, attempt);
    await sleep(backoffMs);
  }

  return false;
}

async function dispatchAlert(payload) {
  try {
    if (!allowByRateLimit(payload)) {
      logger.debug("alert_suppressed_rate_limited", {
        event: "alert_suppressed_rate_limited",
        severity: payload.severity,
        alertEvent: payload.event,
      });
      return false;
    }

    logger.warn("alert_dispatched", {
      event: "alert_dispatched",
      severity: payload.severity,
      title: payload.title,
      requestId: payload.requestId,
      path: payload.path,
    });

    if (ALERT_TRANSPORT === "slack") {
      const slackPayload = toSlackMessage(payload);
      return await postSlack(slackPayload);
    }

    return false;
  } catch (error) {
    logger.error("alert_dispatch_failed", {
      event: "alert_dispatch_failed",
      message: error.message,
    });
    return false;
  }
}

async function sendCriticalAlert(payload) {
  const alertPayload = buildAlertPayload("critical", payload);
  return dispatchAlert(alertPayload);
}

async function sendHighAlert(payload) {
  const alertPayload = buildAlertPayload("high", payload);
  return dispatchAlert(alertPayload);
}

async function sendWarning(payload) {
  const alertPayload = buildAlertPayload("warning", payload);
  return dispatchAlert(alertPayload);
}

module.exports = {
  sendCriticalAlert,
  sendHighAlert,
  sendWarning,
};
