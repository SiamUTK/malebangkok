import http from "k6/http";
import { check } from "k6";
import { loginAndGetToken, getAuthHeaders } from "../auth.js";
import { BASE_URL, COMMON_PARAMS, validateBaseConfig } from "../config.js";
import { buildMatchPayload, safeJsonParse, sleepBetween } from "../utils.js";

validateBaseConfig({ requiresAuth: true });

export const options = {
  vus: 1,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate < 0.01"],
    http_req_duration: ["p(95) < 1000"],
    checks: ["rate > 0.99"],
  },
  tags: {
    suite: "auth-smoke",
  },
};

export default function () {
  // Cached per VU by auth helper => login only once per VU.
  const token = loginAndGetToken();
  const authHeaders = getAuthHeaders(token);

  const healthResponse = http.get(`${BASE_URL}/api/health`, {
    ...COMMON_PARAMS,
    tags: { name: "health" },
  });

  check(healthResponse, {
    "health status 200": (r) => r.status === 200,
  });

  sleepBetween(1, 2);

  const guidesResponse = http.get(`${BASE_URL}/api/guides`, {
    ...COMMON_PARAMS,
    tags: { name: "guides_list" },
  });

  check(guidesResponse, {
    "guides status 200": (r) => r.status === 200,
    "guides returns collection": (r) => {
      const parsed = safeJsonParse(r.body, {});
      return Array.isArray(parsed?.guides || parsed?.data || parsed);
    },
  });

  sleepBetween(1, 2);

  const matchResponse = http.post(
    `${BASE_URL}/api/guides/match`,
    JSON.stringify(buildMatchPayload()),
    {
      ...COMMON_PARAMS,
      headers: authHeaders,
      tags: { name: "guides_match" },
    }
  );

  check(matchResponse, {
    "match status 200": (r) => r.status === 200,
  });

  sleepBetween(1, 2);
}
