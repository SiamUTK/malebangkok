import http from "k6/http";
import { check } from "k6";
import { getAuthHeaders, loginAndGetToken } from "../auth.js";
import { BASE_URL, COMMON_PARAMS, ENABLE_BOOKING_WRITES, validateBaseConfig } from "../config.js";
import { buildMatchPayload, randomDate, safeJsonParse, sleepBetween } from "../utils.js";

validateBaseConfig({ requiresAuth: true });

let vuToken = null;

function extractGuideId(responseBody) {
  const payload = safeJsonParse(responseBody, {});
  const list = payload?.guides || payload?.data || payload || [];
  if (!Array.isArray(list) || list.length === 0) {
    return null;
  }

  const picked = list[Math.floor(Math.random() * list.length)];
  const id = Number(picked?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export const options = {
  stages: [
    { duration: "1m", target: 50 },
    { duration: "1m", target: 100 },
    { duration: "1m", target: 150 },
    { duration: "1m", target: 200 },
    { duration: "2m", target: 200 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    // Aggressive thresholding helps reveal breakpoints early under high concurrency.
    http_req_failed: ["rate < 0.03"],
    http_req_duration: ["p(95) < 1500", "p(99) < 3000"],
  },
  tags: {
    suite: "auth-stress",
  },
};

export default function () {
  if (!vuToken) {
    vuToken = loginAndGetToken();
  }

  const authHeaders = getAuthHeaders(vuToken);
  const action = Math.random();

  if (action < 0.45) {
    const response = http.get(`${BASE_URL}/api/guides`, {
      ...COMMON_PARAMS,
      tags: { name: "stress_guides_list" },
    });

    check(response, {
      "stress guides status 200": (r) => r.status === 200,
      "stress guides under 2s": (r) => r.timings.duration < 2000,
    });
  } else if (action < 0.7) {
    const response = http.post(
      `${BASE_URL}/api/guides/match`,
      JSON.stringify(buildMatchPayload({ minRating: 3.8 })),
      {
        ...COMMON_PARAMS,
        headers: authHeaders,
        tags: { name: "stress_match" },
      }
    );

    check(response, {
      "stress match status 200": (r) => r.status === 200,
      "stress match no 5xx": (r) => r.status < 500,
    });
  } else if (action < 0.9) {
    if (!ENABLE_BOOKING_WRITES) {
      const fallbackResponse = http.post(
        `${BASE_URL}/api/guides/match`,
        JSON.stringify(buildMatchPayload({ minRating: 3.8 })),
        {
          ...COMMON_PARAMS,
          headers: authHeaders,
          tags: { name: "stress_match_write_guard_fallback" },
        }
      );

      check(fallbackResponse, {
        "stress write guard fallback status 200": (r) => r.status === 200,
      });

      sleepBetween(0.2, 1.2);
      return;
    }

    const guidesResponse = http.get(`${BASE_URL}/api/guides`, {
      ...COMMON_PARAMS,
      tags: { name: "stress_prefetch_guides" },
    });
    const guideId = extractGuideId(guidesResponse.body);

    if (guideId) {
      const bookingResponse = http.post(
        `${BASE_URL}/api/bookings`,
        JSON.stringify({
          guideId,
          bookingDate: randomDate({ minDaysAhead: 2, maxDaysAhead: 10 }),
          durationHours: 1,
          notes: `k6 stress test vu=${__VU} iter=${__ITER}`,
          premiumOptions: [],
        }),
        {
          ...COMMON_PARAMS,
          headers: authHeaders,
          tags: { name: "stress_booking_create" },
        }
      );

      check(bookingResponse, {
        "stress booking accepted": (r) => r.status === 201 || r.status === 409,
        "stress booking no 5xx": (r) => r.status < 500,
      });
    }
  } else {
    vuToken = loginAndGetToken({ forceRefresh: true });
    check({ token: vuToken }, {
      "stress login refresh successful": (v) => Boolean(v.token),
    });
  }

  // Think time is short during stress to intentionally push concurrency and surface saturation points.
  sleepBetween(0.2, 1.2);
}
