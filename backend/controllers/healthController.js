const { query } = require("../config/db");
const logger = require("../config/logger");

const DB_PING_TIMEOUT_MS = Number(process.env.HEALTH_DB_TIMEOUT_MS) || 1500;

async function withTimeout(promise, timeoutMs) {
  let timeoutHandle;

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Health DB ping timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function getHealth(req, res) {
  let database = "disconnected";

  try {
    await withTimeout(query("SELECT 1"), DB_PING_TIMEOUT_MS);
    database = "connected";
  } catch (error) {
    logger.warn("health_db_ping_failed", {
      requestId: req.requestId || null,
      message: error.message,
      timeoutMs: DB_PING_TIMEOUT_MS,
    });
  }

  const memoryUsageMB = Math.round((process.memoryUsage().rss / (1024 * 1024)) * 100) / 100;

  return res.status(200).json({
    status: "ok",
    service: "malebangkok-api",
    environment: process.env.NODE_ENV || "production",
    uptimeSeconds: Math.floor(process.uptime()),
    database,
    memoryUsageMB,
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  getHealth,
};
