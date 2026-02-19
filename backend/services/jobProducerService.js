const crypto = require("crypto");
const logger = require("../config/logger");
const { QUEUE_NAMES, createQueue, ensureQueueConnection } = require("../config/queue");

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function createIdempotencyJobId(prefix, payload, explicitKey) {
  if (explicitKey) {
    return `${prefix}:${String(explicitKey)}`;
  }

  const digest = crypto.createHash("sha256").update(stableStringify(payload)).digest("hex").slice(0, 24);
  return `${prefix}:${digest}`;
}

async function safeEnqueue({
  queueName,
  jobName,
  payload,
  idempotencyKey,
  options = {},
  correlationId,
}) {
  try {
    await ensureQueueConnection();
    const queue = createQueue(queueName);

    const jobId = createIdempotencyJobId(jobName, payload, idempotencyKey);

    const job = await queue.add(jobName, payload, {
      jobId,
      ...options,
    });

    logger.info("job_enqueued", {
      event: "job_enqueued",
      queue: queueName,
      jobName,
      jobId: job.id,
      correlationId: correlationId || null,
    });

    return {
      accepted: true,
      queueName,
      jobName,
      jobId: job.id,
    };
  } catch (error) {
    logger.error("job_enqueue_failed", {
      event: "job_enqueue_failed",
      queue: queueName,
      jobName,
      message: error.message,
      correlationId: correlationId || null,
    });

    return {
      accepted: false,
      queueName,
      jobName,
      error: error.message,
    };
  }
}

async function enqueueGuideStatsUpdate(guideId, options = {}) {
  const payload = {
    guideId: Number(guideId),
    triggeredAt: new Date().toISOString(),
    source: options.source || "api",
  };

  return safeEnqueue({
    queueName: QUEUE_NAMES.GUIDE_PERFORMANCE,
    jobName: "guide-stats-update",
    payload,
    idempotencyKey: options.idempotencyKey || `guide:${payload.guideId}`,
    options: {
      delay: Number(options.delayMs || 0),
    },
    correlationId: options.correlationId,
  });
}

async function enqueueAnalyticsEvent(event, options = {}) {
  const payload = {
    ...event,
    receivedAt: new Date().toISOString(),
  };

  return safeEnqueue({
    queueName: QUEUE_NAMES.ANALYTICS,
    jobName: "analytics-event",
    payload,
    idempotencyKey: options.idempotencyKey || event?.idempotencyKey || null,
    options: {
      delay: Number(options.delayMs || 0),
    },
    correlationId: options.correlationId,
  });
}

async function enqueueReconciliationRun(options = {}) {
  const payload = {
    lookbackHours: Number(options.lookbackHours || process.env.RECON_LOOKBACK_HOURS || 48),
    requestedAt: new Date().toISOString(),
    trigger: options.trigger || "system",
  };

  const hourlyBucket = new Date().toISOString().slice(0, 13);

  return safeEnqueue({
    queueName: QUEUE_NAMES.RECONCILIATION,
    jobName: "payment-reconciliation-run",
    payload,
    idempotencyKey: options.idempotencyKey || `recon:${hourlyBucket}`,
    options: {
      delay: Number(options.delayMs || 0),
    },
    correlationId: options.correlationId,
  });
}

async function enqueueEmailNotification(payload, options = {}) {
  const jobPayload = {
    ...payload,
    requestedAt: new Date().toISOString(),
  };

  return safeEnqueue({
    queueName: QUEUE_NAMES.NOTIFICATION,
    jobName: "email-notification",
    payload: jobPayload,
    idempotencyKey: options.idempotencyKey || payload?.messageId || null,
    options: {
      delay: Number(options.delayMs || 0),
    },
    correlationId: options.correlationId,
  });
}

module.exports = {
  enqueueGuideStatsUpdate,
  enqueueAnalyticsEvent,
  enqueueReconciliationRun,
  enqueueEmailNotification,
};
