import { fail } from "k6";

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  return String(value).toLowerCase() === "true";
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function isProductionLikeTarget(baseUrl) {
  const normalized = String(baseUrl || "").toLowerCase();
  return normalized.includes("malebangkok.com") || normalized.includes("hostinger");
}

export const BASE_URL = (__ENV.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
export const TEST_USER_EMAIL = (__ENV.TEST_USER_EMAIL || "").trim();
export const TEST_USER_PASSWORD = __ENV.TEST_USER_PASSWORD || "";

export const DEFAULT_MATCH_PAYLOAD = Object.freeze({
  preferredAgeMin: 24,
  preferredAgeMax: 40,
  priceMin: 0,
  priceMax: 12000,
  verifiedOnly: true,
  minRating: 4,
  requireAvailability: true,
});

export const MATCH_PAYLOAD = Object.freeze(
  __ENV.MATCH_PAYLOAD ? safeJsonParse(__ENV.MATCH_PAYLOAD, DEFAULT_MATCH_PAYLOAD) : DEFAULT_MATCH_PAYLOAD
);

export const ALLOW_PROD = parseBoolean(__ENV.ALLOW_PROD, false);
export const ENABLE_BOOKING_WRITES = parseBoolean(__ENV.ENABLE_BOOKING_WRITES, false);

export const HTTP_TIMEOUT = __ENV.HTTP_TIMEOUT || "30s";

export function validateBaseConfig({ requiresAuth = false, requiresWrites = false } = {}) {
  if (!BASE_URL) {
    fail("Missing BASE_URL. Example: --env BASE_URL=https://staging.malebangkok.com");
  }

  if (isProductionLikeTarget(BASE_URL) && !ALLOW_PROD) {
    fail(
      "Refusing to run against production-like target. Set --env ALLOW_PROD=true only for approved windows."
    );
  }

  if (requiresAuth) {
    if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
      fail(
        "Missing TEST_USER_EMAIL or TEST_USER_PASSWORD. Provide credentials via --env for authenticated flows."
      );
    }
  }

  if (requiresWrites && !ENABLE_BOOKING_WRITES) {
    fail(
      "Write scenario blocked by safety guard. Set --env ENABLE_BOOKING_WRITES=true when approved."
    );
  }
}

export const COMMON_PARAMS = Object.freeze({
  timeout: HTTP_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});
