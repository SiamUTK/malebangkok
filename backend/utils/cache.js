const logger = require("../config/logger");
const { redis, ensureRedisConnection } = require("../config/redis");

const DEFAULT_NAMESPACE = "malebangkok";

function stableSerialize(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  const body = keys
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
    .join(",");

  return `{${body}}`;
}

function buildCacheKey(namespace, paramsObject = {}) {
  const safeNamespace = String(namespace || DEFAULT_NAMESPACE).trim() || DEFAULT_NAMESPACE;
  return `${safeNamespace}:${stableSerialize(paramsObject)}`;
}

async function getCache(key) {
  try {
    const connected = await ensureRedisConnection();
    if (!connected) {
      return null;
    }

    const raw = await redis.get(key);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (parseError) {
      logger.warn("cache_parse_failed", {
        event: "cache_parse_failed",
        key,
        message: parseError.message,
      });
      return null;
    }
  } catch (error) {
    logger.warn("cache_get_failed", {
      event: "cache_get_failed",
      key,
      message: error.message,
    });
    return null;
  }
}

async function setCache(key, value, ttlSeconds) {
  try {
    const connected = await ensureRedisConnection();
    if (!connected) {
      return false;
    }

    const ttl = Math.max(1, Number(ttlSeconds) || 60);
    const payload = JSON.stringify(value);
    await redis.set(key, payload, "EX", ttl);
    return true;
  } catch (error) {
    logger.warn("cache_set_failed", {
      event: "cache_set_failed",
      key,
      message: error.message,
    });
    return false;
  }
}

async function deleteCache(key) {
  try {
    const connected = await ensureRedisConnection();
    if (!connected) {
      return 0;
    }

    return await redis.del(key);
  } catch (error) {
    logger.warn("cache_delete_failed", {
      event: "cache_delete_failed",
      key,
      message: error.message,
    });
    return 0;
  }
}

async function deleteByPattern(pattern) {
  try {
    const connected = await ensureRedisConnection();
    if (!connected) {
      return 0;
    }

    let cursor = "0";
    let totalDeleted = 0;

    do {
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = nextCursor;

      if (Array.isArray(keys) && keys.length > 0) {
        totalDeleted += await redis.del(...keys);
      }
    } while (cursor !== "0");

    return totalDeleted;
  } catch (error) {
    logger.warn("cache_delete_pattern_failed", {
      event: "cache_delete_pattern_failed",
      pattern,
      message: error.message,
    });
    return 0;
  }
}

module.exports = {
  getCache,
  setCache,
  deleteCache,
  deleteByPattern,
  buildCacheKey,
};
