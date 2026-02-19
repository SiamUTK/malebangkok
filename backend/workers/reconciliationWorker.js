const logger = require("../config/logger");
const {
  QUEUE_NAMES,
  createWorker,
  ensureQueueConnection,
  registerGracefulQueueShutdown,
} = require("../config/queue");
const { runReconciliationBatch } = require("../services/paymentReconciliationService");

async function processReconciliationJob(job) {
  const lookbackHours = Number(job.data?.lookbackHours || process.env.RECON_LOOKBACK_HOURS || 48);

  const result = await runReconciliationBatch({
    lookbackHours,
  });

  return {
    ...result,
    triggeredByJobId: job.id,
  };
}

function buildReconciliationWorker() {
  return createWorker(
    QUEUE_NAMES.RECONCILIATION,
    async (job) => {
      try {
        const result = await processReconciliationJob(job);
        logger.info("reconciliation_job_processed", {
          event: "reconciliation_job_processed",
          queue: QUEUE_NAMES.RECONCILIATION,
          jobId: job.id,
          runId: result.runId,
          anomalyCount: result.anomalyCount,
        });
        return result;
      } catch (error) {
        logger.error("reconciliation_job_failed", {
          event: "reconciliation_job_failed",
          queue: QUEUE_NAMES.RECONCILIATION,
          jobId: job.id,
          attemptsMade: job.attemptsMade,
          message: error.message,
        });
        throw error;
      }
    },
    {
      concurrency: Number(process.env.RECON_WORKER_CONCURRENCY || 1),
      lockDuration: Number(process.env.RECON_WORKER_LOCK_MS || 120000),
    }
  );
}

async function startReconciliationWorker() {
  await ensureQueueConnection();
  registerGracefulQueueShutdown();

  const worker = buildReconciliationWorker();
  logger.info("reconciliation_worker_started", {
    event: "reconciliation_worker_started",
    queue: QUEUE_NAMES.RECONCILIATION,
  });

  return worker;
}

if (require.main === module) {
  startReconciliationWorker().catch((error) => {
    logger.error("reconciliation_worker_boot_failed", {
      event: "reconciliation_worker_boot_failed",
      message: error.message,
    });
    process.exit(1);
  });
}

module.exports = {
  startReconciliationWorker,
  buildReconciliationWorker,
};
