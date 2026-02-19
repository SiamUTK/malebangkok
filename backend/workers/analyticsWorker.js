const { query } = require("../config/db");
const logger = require("../config/logger");
const {
  QUEUE_NAMES,
  createWorker,
  ensureQueueConnection,
  registerGracefulQueueShutdown,
} = require("../config/queue");

const VALID_EVENT_TYPES = new Set([
  "guide_viewed",
  "guide_clicked",
  "booking_started",
  "booking_completed",
  "matching_used",
  "search_performed",
]);

async function insertAnalyticsEvent(event) {
  const userId = Number(event?.userId);
  const guideId = event?.guideId ? String(event.guideId) : null;
  const eventType = String(event?.eventType || "").trim().toLowerCase();

  if (!Number.isFinite(userId) || userId <= 0) {
    throw new Error("Invalid analytics userId");
  }

  if (!VALID_EVENT_TYPES.has(eventType)) {
    throw new Error("Unsupported analytics eventType");
  }

  const idempotencyKey = event?.idempotencyKey ? String(event.idempotencyKey) : null;
  const metadata = event?.metadata && typeof event.metadata === "object" ? event.metadata : {};

  await query(
    `
      INSERT INTO user_behavior_events (user_id, event_type, guide_id, metadata, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [userId, eventType, guideId, JSON.stringify({ ...metadata, idempotencyKey })]
  );

  return {
    userId,
    eventType,
    idempotencyKey,
  };
}

function buildAnalyticsWorker() {
  return createWorker(
    QUEUE_NAMES.ANALYTICS,
    async (job) => {
      try {
        const result = await insertAnalyticsEvent(job.data);
        logger.info("analytics_job_processed", {
          event: "analytics_job_processed",
          queue: QUEUE_NAMES.ANALYTICS,
          jobId: job.id,
          userId: result.userId,
          eventType: result.eventType,
        });
        return result;
      } catch (error) {
        logger.error("analytics_job_failed", {
          event: "analytics_job_failed",
          queue: QUEUE_NAMES.ANALYTICS,
          jobId: job.id,
          attemptsMade: job.attemptsMade,
          message: error.message,
        });
        throw error;
      }
    },
    {
      concurrency: Number(process.env.ANALYTICS_WORKER_CONCURRENCY || 10),
      lockDuration: Number(process.env.ANALYTICS_WORKER_LOCK_MS || 30000),
    }
  );
}

async function startAnalyticsWorker() {
  await ensureQueueConnection();
  registerGracefulQueueShutdown();
  const worker = buildAnalyticsWorker();

  logger.info("analytics_worker_started", {
    event: "analytics_worker_started",
    queue: QUEUE_NAMES.ANALYTICS,
  });

  return worker;
}

if (require.main === module) {
  startAnalyticsWorker().catch((error) => {
    logger.error("analytics_worker_boot_failed", {
      event: "analytics_worker_boot_failed",
      message: error.message,
    });
    process.exit(1);
  });
}

module.exports = {
  startAnalyticsWorker,
  buildAnalyticsWorker,
};
