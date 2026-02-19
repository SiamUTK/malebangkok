require("dotenv").config();

const logger = require("../config/logger");
const { ensureQueueConnection, registerGracefulQueueShutdown } = require("../config/queue");
const { startGuideStatsWorker } = require("./guideStatsWorker");
const { startAnalyticsWorker } = require("./analyticsWorker");
const { startReconciliationWorker } = require("./reconciliationWorker");
const { startNotificationWorker } = require("./notificationWorker");

async function startWorkers() {
  await ensureQueueConnection();
  registerGracefulQueueShutdown();

  await Promise.all([
    startGuideStatsWorker(),
    startAnalyticsWorker(),
    startReconciliationWorker(),
    startNotificationWorker(),
  ]);

  logger.info("all_workers_started", {
    event: "all_workers_started",
  });
}

startWorkers().catch((error) => {
  logger.error("workers_bootstrap_failed", {
    event: "workers_bootstrap_failed",
    message: error.message,
  });
  process.exit(1);
});
