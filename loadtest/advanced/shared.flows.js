import http from "k6/http";
import { check } from "k6";
import { BASE_URL, COMMON_PARAMS, ENABLE_BOOKING_WRITES } from "../config.js";
import { buildMatchPayload, randomDate, safeJsonParse, sleepBetween } from "../utils.js";

function pickRandom(array) {
  return Array.isArray(array) && array.length > 0
    ? array[Math.floor(Math.random() * array.length)]
    : null;
}

export function fetchGuidesCollection({ flow }) {
  const response = http.get(`${BASE_URL}/api/guides`, {
    ...COMMON_PARAMS,
    tags: {
      name: "guides_list",
      endpoint: "guides_list",
      flow,
    },
  });

  check(
    response,
    {
      "guides list status 200": (r) => r.status === 200,
    },
    { flow }
  );

  const parsed = safeJsonParse(response.body, {});
  const list = parsed?.guides || parsed?.data || parsed || [];
  return Array.isArray(list) ? list : [];
}

export function viewGuideProfile({ guideId, flow }) {
  const normalizedGuideId = Number(guideId);
  if (!Number.isFinite(normalizedGuideId) || normalizedGuideId <= 0) {
    return;
  }

  const response = http.get(`${BASE_URL}/api/guides/${normalizedGuideId}`, {
    ...COMMON_PARAMS,
    tags: {
      name: "guide_profile",
      endpoint: "guide_profile",
      flow,
    },
  });

  check(
    response,
    {
      "guide profile status 200": (r) => r.status === 200,
    },
    { flow }
  );
}

export function runAnonymousSession() {
  const guides = fetchGuidesCollection({ flow: "anonymous" });

  if (Math.random() < 0.55) {
    const selectedGuide = pickRandom(guides);
    viewGuideProfile({ guideId: selectedGuide?.id, flow: "anonymous" });
  }

  if (Math.random() < 0.2) {
    const response = http.get(`${BASE_URL}/api/health`, {
      ...COMMON_PARAMS,
      tags: {
        name: "health_check",
        endpoint: "health",
        flow: "anonymous",
      },
    });

    check(
      response,
      {
        "health status 200": (r) => r.status === 200,
      },
      { flow: "anonymous" }
    );
  }

  sleepBetween(1.2, 4.2);
}

export function runAuthenticatedBrowsingSession(authHeaders) {
  const guides = fetchGuidesCollection({ flow: "authenticated" });

  if (Math.random() < 0.6) {
    const selectedGuide = pickRandom(guides);
    viewGuideProfile({ guideId: selectedGuide?.id, flow: "authenticated" });
  }

  if (Math.random() < 0.45) {
    const response = http.post(
      `${BASE_URL}/api/guides/match`,
      JSON.stringify(buildMatchPayload()),
      {
        ...COMMON_PARAMS,
        headers: authHeaders,
        tags: {
          name: "guides_match",
          endpoint: "guides_match",
          flow: "authenticated",
        },
      }
    );

    check(
      response,
      {
        "match status 200": (r) => r.status === 200,
      },
      { flow: "authenticated" }
    );
  }

  if (Math.random() < 0.3) {
    const response = http.get(`${BASE_URL}/api/bookings/my`, {
      ...COMMON_PARAMS,
      headers: authHeaders,
      tags: {
        name: "bookings_my",
        endpoint: "bookings_my",
        flow: "authenticated",
      },
    });

    check(
      response,
      {
        "bookings my status 200": (r) => r.status === 200,
      },
      { flow: "authenticated" }
    );
  }

  sleepBetween(1.5, 5);
}

export function runBookingAndPaymentSession(authHeaders) {
  const guides = fetchGuidesCollection({ flow: "revenue" });
  const selectedGuide = pickRandom(guides);
  const guideId = Number(selectedGuide?.id);

  if (!Number.isFinite(guideId) || guideId <= 0) {
    sleepBetween(1, 2);
    return;
  }

  if (!ENABLE_BOOKING_WRITES) {
    const fallbackResponse = http.post(
      `${BASE_URL}/api/guides/match`,
      JSON.stringify(buildMatchPayload()),
      {
        ...COMMON_PARAMS,
        headers: authHeaders,
        tags: {
          name: "guides_match_write_guard_fallback",
          endpoint: "guides_match",
          flow: "revenue",
        },
      }
    );

    check(
      fallbackResponse,
      {
        "fallback match status 200": (r) => r.status === 200,
      },
      { flow: "revenue" }
    );

    sleepBetween(1, 3);
    return;
  }

  const bookingResponse = http.post(
    `${BASE_URL}/api/bookings`,
    JSON.stringify({
      guideId,
      bookingDate: randomDate({ minDaysAhead: 1, maxDaysAhead: 21 }),
      durationHours: 1,
      premiumOptions: [],
      notes: `k6-advanced vu=${__VU} iter=${__ITER}`,
    }),
    {
      ...COMMON_PARAMS,
      headers: authHeaders,
      tags: {
        name: "booking_create",
        endpoint: "booking_create",
        flow: "revenue",
      },
    }
  );

  check(
    bookingResponse,
    {
      "booking create accepted": (r) => r.status === 201 || r.status === 409,
      "booking create no 5xx": (r) => r.status < 500,
    },
    { flow: "revenue" }
  );

  if (bookingResponse.status !== 201) {
    sleepBetween(1, 2);
    return;
  }

  const booking = safeJsonParse(bookingResponse.body, {})?.booking;
  const bookingId = Number(booking?.id);

  if (!Number.isFinite(bookingId) || bookingId <= 0) {
    sleepBetween(1, 2);
    return;
  }

  sleepBetween(0.4, 1.2);

  const paymentIntentResponse = http.post(
    `${BASE_URL}/api/payments/intent`,
    JSON.stringify({ bookingId }),
    {
      ...COMMON_PARAMS,
      headers: authHeaders,
      tags: {
        name: "payments_intent_create",
        endpoint: "payments_intent_create",
        flow: "revenue",
      },
    }
  );

  check(
    paymentIntentResponse,
    {
      "payment intent accepted": (r) => r.status === 201 || r.status === 409,
      "payment intent no 5xx": (r) => r.status < 500,
    },
    { flow: "revenue" }
  );

  sleepBetween(1, 2.5);
}
