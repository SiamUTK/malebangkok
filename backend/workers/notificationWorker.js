const logger = require("../config/logger");
const {
  QUEUE_NAMES,
  createWorker,
  ensureQueueConnection,
  registerGracefulQueueShutdown,
} = require("../config/queue");

async function processNotificationJob(job) {
  const payload = job.data || {};
  const channel = String(payload.channel || "email").toLowerCase();
  const to = payload.to || null;
  const template = payload.template || "generic";

  if (!to) {
    throw new Error("Notification payload missing recipient");
  }

  // Stub-ready worker: currently logs and returns success for future provider integration.
  logger.info("notification_dispatched_stub", {
    event: "notification_dispatched_stub",
    queue: QUEUE_NAMES.NOTIFICATION,
    jobId: job.id,
    channel,
    to,
    template,
  });

  return {
    dispatched: true,
    channel,
    to,
    template,
  };
}

function buildNotificationWorker() {
  return createWorker(
    QUEUE_NAMES.NOTIFICATION,
    async (job) => {
      try {
        const result = await processNotificationJob(job);
        logger.info("notification_job_processed", {
          event: "notification_job_processed",
          queue: QUEUE_NAMES.NOTIFICATION,
          jobId: job.id,
          dispatched: result.dispatched,
        });
        return result;
      } catch (error) {
        logger.error("notification_job_failed", {
          event: "notification_job_failed",
          queue: QUEUE_NAMES.NOTIFICATION,
          jobId: job.id,
          attemptsMade: job.attemptsMade,
          message: error.message,
        });
        throw error;
      }
    },
    {
      concurrency: Number(process.env.NOTIFICATION_WORKER_CONCURRENCY || 5),
      lockDuration: Number(process.env.NOTIFICATION_WORKER_LOCK_MS || 30000),
    }
  );
}

async function startNotificationWorker() {
  await ensureQueueConnection();
  registerGracefulQueueShutdown();

  const worker = buildNotificationWorker();
  logger.info("notification_worker_started", {
    event: "notification_worker_started",
    queue: QUEUE_NAMES.NOTIFICATION,
  });

  return worker;
}

if (require.main === module) {
  startNotificationWorker().catch((error) => {
    logger.error("notification_worker_boot_failed", {
      event: "notification_worker_boot_failed",
      message: error.message,
    });
    process.exit(1);
  });
}

module.exports = {
  startNotificationWorker,
  buildNotificationWorker,
};
