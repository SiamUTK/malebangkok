import { sleep } from "k6";
import { DEFAULT_MATCH_PAYLOAD, MATCH_PAYLOAD } from "./config.js";

export function randomDate({ minDaysAhead = 1, maxDaysAhead = 21 } = {}) {
  const now = new Date();
  const daysAhead = Math.floor(Math.random() * (maxDaysAhead - minDaysAhead + 1)) + minDaysAhead;

  const future = new Date(now.getTime());
  future.setUTCDate(future.getUTCDate() + daysAhead);

  const hour = 9 + Math.floor(Math.random() * 10);
  const minute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];

  future.setUTCHours(hour, minute, 0, 0);
  return future.toISOString();
}

export function sleepBetween(minSeconds = 1, maxSeconds = 3) {
  const jitter = Math.random() * (maxSeconds - minSeconds);
  sleep(minSeconds + jitter);
}

export function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function buildMatchPayload(overrides = {}) {
  return {
    ...DEFAULT_MATCH_PAYLOAD,
    ...(MATCH_PAYLOAD || {}),
    ...(overrides || {}),
  };
}
