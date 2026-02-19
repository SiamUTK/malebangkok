import http from "k6/http";
import { check } from "k6";
import { getAuthHeaders, loginAndGetToken } from "../auth.js";
import {
  BASE_URL,
  COMMON_PARAMS,
  ENABLE_BOOKING_WRITES,
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
  validateBaseConfig,
} from "../config.js";
import { buildMatchPayload, randomDate, safeJsonParse, sleepBetween } from "../utils.js";

validateBaseConfig({ requiresAuth: true });

let vuToken = null;

function pickGuideId(guidesPayload, fallbackGuideIds = []) {
  const list = guidesPayload?.guides || guidesPayload?.data || guidesPayload || [];
  if (Array.isArray(list) && list.length > 0) {
    const picked = list[Math.floor(Math.random() * list.length)];
    return Number(picked?.id);
  }

  if (fallbackGuideIds.length > 0) {
    return Number(fallbackGuideIds[Math.floor(Math.random() * fallbackGuideIds.length)]);
  }

  return null;
}

export const options = {
  stages: [
    { duration: "1m", target: 20 },
    { duration: "1m", target: 50 },
    { duration: "2m", target: 50 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate < 0.01"],
    http_req_duration: ["p(95) < 800"],
  },
  tags: {
    suite: "auth-load",
  },
};

export function setup() {
  const loginResponse = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD }),
    {
      ...COMMON_PARAMS,
      tags: { name: "setup_auth_login" },
    }
  );

  check(loginResponse, {
    "setup login status 200": (r) => r.status === 200,
  });

  const token = safeJsonParse(loginResponse.body, {})?.token || null;

  const guidesResponse = http.get(`${BASE_URL}/api/guides`, {
    ...COMMON_PARAMS,
    tags: { name: "setup_guides" },
  });

  const guidesPayload = safeJsonParse(guidesResponse.body, {});
  const list = guidesPayload?.guides || guidesPayload?.data || guidesPayload || [];
  const guideIds = Array.isArray(list)
    ? list.map((guide) => Number(guide?.id)).filter((id) => Number.isFinite(id) && id > 0)
    : [];

  return {
    seedToken: token,
    guideIds,
  };
}

export default function (setupData) {
  if (!vuToken) {
    vuToken = setupData?.seedToken || loginAndGetToken();
  }

  const authHeaders = getAuthHeaders(vuToken);
  const action = Math.random();

  if (action < 0.5) {
    // 50% browse guides
    const response = http.get(`${BASE_URL}/api/guides`, {
      ...COMMON_PARAMS,
      tags: { name: "guides_list" },
    });

    check(response, {
      "browse guides status 200": (r) => r.status === 200,
    });
  } else if (action < 0.7) {
    // 20% view profile
    const guidesResponse = http.get(`${BASE_URL}/api/guides`, {
      ...COMMON_PARAMS,
      tags: { name: "guides_prefetch_for_profile" },
    });

    const guidesPayload = safeJsonParse(guidesResponse.body, {});
    const guideId = pickGuideId(guidesPayload, setupData?.guideIds || []);

    if (guideId) {
      const profileResponse = http.get(`${BASE_URL}/api/guides/${guideId}`, {
        ...COMMON_PARAMS,
        tags: { name: "guide_profile" },
      });

      check(profileResponse, {
        "guide profile status 200": (r) => r.status === 200,
      });
    }
  } else if (action < 0.85) {
    // 15% matching (authenticated)
    const response = http.post(
      `${BASE_URL}/api/guides/match`,
      JSON.stringify(buildMatchPayload()),
      {
        ...COMMON_PARAMS,
        headers: authHeaders,
        tags: { name: "guides_match" },
      }
    );

    check(response, {
      "matching status 200": (r) => r.status === 200,
    });
  } else if (action < 0.95) {
    // 10% start booking (authenticated, write path)
    if (!ENABLE_BOOKING_WRITES) {
      const fallbackResponse = http.post(
        `${BASE_URL}/api/guides/match`,
        JSON.stringify(buildMatchPayload()),
        {
          ...COMMON_PARAMS,
          headers: authHeaders,
          tags: { name: "guides_match_write_guard_fallback" },
        }
      );

      check(fallbackResponse, {
        "write guard fallback status 200": (r) => r.status === 200,
      });

      sleepBetween(1, 4);
      return;
    }

    const guidesResponse = http.get(`${BASE_URL}/api/guides`, {
      ...COMMON_PARAMS,
      tags: { name: "guides_prefetch_for_booking" },
    });
    const guidesPayload = safeJsonParse(guidesResponse.body, {});
    const guideId = pickGuideId(guidesPayload, setupData?.guideIds || []);

    if (guideId) {
      const bookingResponse = http.post(
        `${BASE_URL}/api/bookings`,
        JSON.stringify({
          guideId,
          bookingDate: randomDate(),
          durationHours: 1,
          notes: `k6 load test iteration=${__ITER} vu=${__VU}`,
          premiumOptions: [],
        }),
        {
          ...COMMON_PARAMS,
          headers: authHeaders,
          tags: { name: "booking_create" },
        }
      );

      check(bookingResponse, {
        "booking create accepted": (r) => r.status === 201 || r.status === 409,
        "booking create no server error": (r) => r.status < 500,
      });
    }
  } else {
    // 5% login refresh
    vuToken = loginAndGetToken({ forceRefresh: true });
    check({ token: vuToken }, {
      "login refresh token present": (v) => Boolean(v.token),
    });
  }

  sleepBetween(1, 4);
}
