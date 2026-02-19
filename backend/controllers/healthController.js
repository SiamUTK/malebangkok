const { query } = require("../config/db");
const { redis, ensureRedisConnection } = require("../config/redis");
const logger = require("../config/logger");

const DB_PING_TIMEOUT_MS = Number(process.env.HEALTH_DB_TIMEOUT_MS) || 1500;
const REDIS_PING_TIMEOUT_MS = Number(process.env.HEALTH_REDIS_TIMEOUT_MS) || 1000;
const redisEnabled = String(process.env.REDIS_ENABLED || "true").toLowerCase() !== "false";
const appVersion = process.env.APP_VERSION || process.env.npm_package_version || "1.0.0";

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
  const dbStatus = await getDatabaseStatus(req);
  const cacheStatus = await getRedisStatus(req);
  const memoryUsageMB = Math.round((process.memoryUsage().rss / (1024 * 1024)) * 100) / 100;
  const memoryHeapUsedMB = Math.round((process.memoryUsage().heapUsed / (1024 * 1024)) * 100) / 100;
  const statusCode = dbStatus === "connected" ? 200 : 503;
  const overallStatus = statusCode === 200 ? "ok" : "degraded";

  return res.status(statusCode).json({
    status: overallStatus,
    checks: {
      liveness: "alive",
      readiness: statusCode === 200 ? "ready" : "not_ready",
      database: dbStatus,
      redis: cacheStatus,
    },
    service: "malebangkok-api",
    version: appVersion,
    environment: process.env.NODE_ENV || "production",
    uptimeSeconds: Math.floor(process.uptime()),
    memory: {
      rssMB: memoryUsageMB,
      heapUsedMB: memoryHeapUsedMB,
    },
    timestamp: new Date().toISOString(),
    requestId: req.requestId || null,
  });
}

async function getDatabaseStatus(req) {
  try {
    await withTimeout(query("SELECT 1"), DB_PING_TIMEOUT_MS);
    return "connected";
  } catch (error) {
    logger.warn("health_db_ping_failed", {
      requestId: req.requestId || null,
      message: error.message,
      timeoutMs: DB_PING_TIMEOUT_MS,
    });
    return "disconnected";
  }
}

async function getRedisStatus(req) {
  if (!redisEnabled) {
    return "disabled";
  }

  try {
    const connected = await withTimeout(ensureRedisConnection(), REDIS_PING_TIMEOUT_MS);
    if (!connected) {
      return "disconnected";
    }

    await withTimeout(redis.ping(), REDIS_PING_TIMEOUT_MS);
    return "connected";
  } catch (error) {
    logger.warn("health_redis_ping_failed", {
      requestId: req.requestId || null,
      message: error.message,
      timeoutMs: REDIS_PING_TIMEOUT_MS,
    });
    return "disconnected";
  }
}

function getLiveness(req, res) {
  const memoryUsageMB = Math.round((process.memoryUsage().rss / (1024 * 1024)) * 100) / 100;

  return res.status(200).json({
    status: "alive",
    service: "malebangkok-api",
    version: appVersion,
    environment: process.env.NODE_ENV || "production",
    uptimeSeconds: Math.floor(process.uptime()),
    memory: {
      rssMB: memoryUsageMB,
    },
    timestamp: new Date().toISOString(),
    requestId: req.requestId || null,
  });
}

module.exports = {
  getHealth,
  getLiveness,
};
