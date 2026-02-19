const { Queue, Worker, QueueEvents, JobScheduler } = require("bullmq");
const IORedis = require("ioredis");
const logger = require("./logger");

const REDIS_URL = process.env.REDIS_URL || null;
const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const REDIS_DB = Number(process.env.REDIS_DB || 0);
const REDIS_USERNAME = process.env.REDIS_USERNAME || undefined;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_TLS = String(process.env.REDIS_TLS || "false").toLowerCase() === "true";

const QUEUE_PREFIX = process.env.QUEUE_PREFIX || "malebangkok";
const DEFAULT_JOB_ATTEMPTS = Number(process.env.QUEUE_JOB_ATTEMPTS || 4);
const DEFAULT_JOB_BACKOFF_MS = Number(process.env.QUEUE_JOB_BACKOFF_MS || 2000);
const DEFAULT_REMOVE_ON_COMPLETE = Number(process.env.QUEUE_REMOVE_ON_COMPLETE || 1000);
const DEFAULT_REMOVE_ON_FAIL = Number(process.env.QUEUE_REMOVE_ON_FAIL || 5000);
const DEFAULT_JOB_TIMEOUT_MS = Number(process.env.QUEUE_JOB_TIMEOUT_MS || 45000);

const QUEUE_NAMES = Object.freeze({
  ANALYTICS: "analytics.aggregation.v1",
  GUIDE_PERFORMANCE: "guide.performance.v1",
  RECONCILIATION: "payments.reconciliation.v1",
  NOTIFICATION: "notifications.email.v1",
  RETRY_RECOVERY: "system.retry-recovery.v1",
});

function buildRedisConnectionOptions() {
  return {
    host: REDIS_HOST,
    port: REDIS_PORT,
    db: REDIS_DB,
    username: REDIS_USERNAME,
    password: REDIS_PASSWORD,
    tls: REDIS_TLS ? {} : undefined,
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: null,
  };
}

const queueConnection = REDIS_URL
  ? new IORedis(REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: null,
    })
  : new IORedis(buildRedisConnectionOptions());

const queues = new Map();
const queueEventsMap = new Map();
const schedulers = new Map();
const workers = new Set();

const DEFAULT_JOB_OPTIONS = Object.freeze({
  attempts: DEFAULT_JOB_ATTEMPTS,
  backoff: {
    type: "exponential",
    delay: DEFAULT_JOB_BACKOFF_MS,
  },
  removeOnComplete: DEFAULT_REMOVE_ON_COMPLETE,
  removeOnFail: DEFAULT_REMOVE_ON_FAIL,
  timeout: DEFAULT_JOB_TIMEOUT_MS,
});

async function ensureQueueConnection() {
  if (queueConnection.status !== "ready") {
    await queueConnection.connect();
  }
}

function createQueue(queueName) {
  if (queues.has(queueName)) {
    return queues.get(queueName);
  }

  const queue = new Queue(queueName, {
    connection: queueConnection,
    prefix: QUEUE_PREFIX,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });

  const queueEvents = new QueueEvents(queueName, {
    connection: queueConnection.duplicate(),
    prefix: QUEUE_PREFIX,
  });

  queueEvents.on("failed", ({ jobId, failedReason }) => {
    logger.warn("queue_job_failed_event", {
      event: "queue_job_failed_event",
      queue: queueName,
      jobId,
      failedReason,
    });
  });

  queueEvents.on("stalled", ({ jobId }) => {
    logger.warn("queue_job_stalled", {
      event: "queue_job_stalled",
      queue: queueName,
      jobId,
    });
  });

  queueEvents.on("waiting", ({ jobId }) => {
    logger.debug("queue_job_waiting", {
      event: "queue_job_waiting",
      queue: queueName,
      jobId,
    });
  });

  const scheduler = new JobScheduler(queueName, {
    connection: queueConnection.duplicate(),
    prefix: QUEUE_PREFIX,
  });

  queues.set(queueName, queue);
  queueEventsMap.set(queueName, queueEvents);
  schedulers.set(queueName, scheduler);
  return queue;
}

function createWorker(queueName, processor, options = {}) {
  const worker = new Worker(queueName, processor, {
    connection: queueConnection.duplicate(),
    prefix: QUEUE_PREFIX,
    concurrency: Number(options.concurrency || 5),
    autorun: options.autorun !== false,
    lockDuration: Number(options.lockDuration || 30000),
    stalledInterval: Number(options.stalledInterval || 30000),
    maxStalledCount: Number(options.maxStalledCount || 2),
  });

  worker.on("failed", (job, error) => {
    logger.error("worker_job_failed", {
      event: "worker_job_failed",
      queue: queueName,
      jobId: job?.id || null,
      attemptsMade: job?.attemptsMade || null,
      message: error.message,
    });
  });

  worker.on("completed", (job) => {
    logger.info("worker_job_completed", {
      event: "worker_job_completed",
      queue: queueName,
      jobId: job?.id || null,
      name: job?.name || null,
    });
  });

  workers.add(worker);
  return worker;
}

async function getQueueHealth() {
  const entries = [];
  for (const queueName of Object.values(QUEUE_NAMES)) {
    const queue = createQueue(queueName);
    const counts = await queue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed",
      "paused"
    );

    entries.push({
      queue: queueName,
      counts,
    });
  }

  return {
    redisStatus: queueConnection.status,
    queues: entries,
    timestamp: new Date().toISOString(),
  };
}

async function closeQueueInfrastructure() {
  for (const worker of workers) {
    try {
      await worker.close();
    } catch (error) {
      logger.warn("worker_close_failed", {
        event: "worker_close_failed",
        message: error.message,
      });
    }
  }

  for (const queueEvents of queueEventsMap.values()) {
    try {
      await queueEvents.close();
    } catch (error) {
      logger.warn("queue_events_close_failed", {
        event: "queue_events_close_failed",
        message: error.message,
      });
    }
  }

  for (const scheduler of schedulers.values()) {
    try {
      await scheduler.close();
    } catch (error) {
      logger.warn("queue_scheduler_close_failed", {
        event: "queue_scheduler_close_failed",
        message: error.message,
      });
    }
  }

  for (const queue of queues.values()) {
    try {
      await queue.close();
    } catch (error) {
      logger.warn("queue_close_failed", {
        event: "queue_close_failed",
        message: error.message,
      });
    }
  }

  try {
    await queueConnection.quit();
  } catch (error) {
    logger.warn("queue_connection_quit_failed", {
      event: "queue_connection_quit_failed",
      message: error.message,
    });
  }
}

function registerGracefulQueueShutdown() {
  let shuttingDown = false;

  const shutdown = async (signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.warn("queue_shutdown_started", {
      event: "queue_shutdown_started",
      signal,
    });

    await closeQueueInfrastructure();

    logger.warn("queue_shutdown_completed", {
      event: "queue_shutdown_completed",
      signal,
    });
  };

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
}

module.exports = {
  QUEUE_NAMES,
  DEFAULT_JOB_OPTIONS,
  queueConnection,
  ensureQueueConnection,
  createQueue,
  createWorker,
  getQueueHealth,
  closeQueueInfrastructure,
  registerGracefulQueueShutdown,
};
