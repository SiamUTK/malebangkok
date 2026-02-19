const Redis = require("ioredis");
const logger = require("./logger");
const { sendWarning } = require("../services/alertService");

const REDIS_CONNECT_TIMEOUT_MS = Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 5000);
const REDIS_COMMAND_TIMEOUT_MS = Number(process.env.REDIS_COMMAND_TIMEOUT_MS || 2000);
const REDIS_MAX_RETRIES_PER_REQUEST = Number(process.env.REDIS_MAX_RETRIES_PER_REQUEST || 1);
const REDIS_RETRY_BASE_MS = Number(process.env.REDIS_RETRY_BASE_MS || 150);
const REDIS_RETRY_MAX_MS = Number(process.env.REDIS_RETRY_MAX_MS || 3000);

const redisUrl = process.env.REDIS_URL || null;
const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = Number(process.env.REDIS_PORT || 6379);
const redisDb = Number(process.env.REDIS_DB || 0);
const redisUsername = process.env.REDIS_USERNAME || undefined;
const redisPassword = process.env.REDIS_PASSWORD || undefined;
const redisTls = String(process.env.REDIS_TLS || "false").toLowerCase() === "true";

function buildRedisOptions() {
  return {
    host: redisHost,
    port: redisPort,
    db: redisDb,
    username: redisUsername,
    password: redisPassword,
    tls: redisTls ? {} : undefined,
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
    commandTimeout: REDIS_COMMAND_TIMEOUT_MS,
    maxRetriesPerRequest: REDIS_MAX_RETRIES_PER_REQUEST,
    retryStrategy: (times) => {
      const delay = Math.min(REDIS_RETRY_BASE_MS * times, REDIS_RETRY_MAX_MS);
      return delay;
    },
  };
}

const redis = redisUrl
  ? new Redis(redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
      commandTimeout: REDIS_COMMAND_TIMEOUT_MS,
      maxRetriesPerRequest: REDIS_MAX_RETRIES_PER_REQUEST,
      retryStrategy: (times) => {
        const delay = Math.min(REDIS_RETRY_BASE_MS * times, REDIS_RETRY_MAX_MS);
        return delay;
      },
    })
  : new Redis(buildRedisOptions());

let warnedUnavailable = false;

redis.on("connect", () => {
  warnedUnavailable = false;
  logger.info("redis_connected", {
    event: "redis_connected",
    host: redisHost,
    port: redisPort,
    db: redisDb,
  });
});

redis.on("ready", () => {
  logger.info("redis_ready", {
    event: "redis_ready",
  });
});

redis.on("error", (error) => {
  if (!warnedUnavailable) {
    warnedUnavailable = true;
    logger.warn("redis_unavailable_fail_open", {
      event: "redis_unavailable_fail_open",
      message: error.message,
    });

    Promise.resolve(
      sendWarning({
        event: "redis_unavailable",
        title: "Redis unavailable - running in fail-open mode",
        message: error.message,
        code: error.code || null,
      })
    ).catch(() => {});
    return;
  }

  logger.debug("redis_error", {
    event: "redis_error",
    message: error.message,
  });
});

async function ensureRedisConnection() {
  try {
    if (redis.status === "end") {
      return false;
    }

    if (redis.status !== "ready" && redis.status !== "connect") {
      await redis.connect();
    }

    return redis.status === "ready" || redis.status === "connect";
  } catch (error) {
    logger.warn("redis_connect_failed", {
      event: "redis_connect_failed",
      message: error.message,
    });
    return false;
  }
}

module.exports = {
  redis,
  ensureRedisConnection,
};
