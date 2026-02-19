import http from "k6/http";
import { check, fail } from "k6";
import { getAuthHeaders, loginAndGetToken } from "../auth.js";
import { BASE_URL, COMMON_PARAMS, validateBaseConfig } from "../config.js";
import { randomDate, safeJsonParse, sleepBetween } from "../utils.js";

validateBaseConfig({ requiresAuth: true, requiresWrites: true });

function extractGuides(body) {
  const payload = safeJsonParse(body, {});
  const guides = payload?.guides || payload?.data || payload || [];
  return Array.isArray(guides) ? guides : [];
}

export const options = {
  scenarios: {
    booking_revenue_path: {
      executor: "ramping-vus",
      stages: [
        { duration: "30s", target: 5 },
        { duration: "2m", target: 20 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate < 0.02"],
    http_req_duration: ["p(95) < 1200"],
    "checks{flow:booking_revenue}": ["rate > 0.98"],
  },
  tags: {
    suite: "booking-revenue-auth",
  },
};

export default function () {
  const token = loginAndGetToken();
  const authHeaders = getAuthHeaders(token);

  // 1) Login already done via helper above.
  check({ token }, { "flow token exists": (v) => Boolean(v.token) }, { flow: "booking_revenue" });

  // 2) Fetch guides.
  const guidesResponse = http.get(`${BASE_URL}/api/guides`, {
    ...COMMON_PARAMS,
    tags: { name: "booking_flow_guides" },
  });

  const guides = extractGuides(guidesResponse.body);
  check(guidesResponse, {
    "flow guides status 200": (r) => r.status === 200,
    "flow guides non-empty": () => guides.length > 0,
  }, { flow: "booking_revenue" });

  if (guides.length === 0) {
    fail("No guides available for booking flow test.");
  }

  const selectedGuide = guides[Math.floor(Math.random() * guides.length)];
  const guideId = Number(selectedGuide?.id);
  if (!Number.isFinite(guideId) || guideId <= 0) {
    fail("Invalid guide id in guides payload.");
  }

  sleepBetween(0.5, 1.5);

  // 3) Create booking.
  const bookingResponse = http.post(
    `${BASE_URL}/api/bookings`,
    JSON.stringify({
      guideId,
      bookingDate: randomDate({ minDaysAhead: 2, maxDaysAhead: 28 }),
      durationHours: 1,
      notes: `k6 booking flow test vu=${__VU} iter=${__ITER}`,
      premiumOptions: [],
    }),
    {
      ...COMMON_PARAMS,
      headers: authHeaders,
      tags: { name: "booking_flow_create_booking", flow: "booking_revenue" },
    }
  );

  check(bookingResponse, {
    "flow booking status 201": (r) => r.status === 201,
  }, { flow: "booking_revenue" });

  if (bookingResponse.status !== 201) {
    // Do not continue to payment intent without a created booking in this critical-path scenario.
    return;
  }

  const createdBooking = safeJsonParse(bookingResponse.body, {})?.booking;
  const bookingId = Number(createdBooking?.id);

  if (!Number.isFinite(bookingId) || bookingId <= 0) {
    fail(`Booking created but booking id missing. body=${bookingResponse.body}`);
  }

  sleepBetween(0.5, 1.2);

  // 4) Create payment intent (safe: this does NOT confirm card payment / no charge capture by itself).
  const paymentIntentResponse = http.post(
    `${BASE_URL}/api/payments/intent`,
    JSON.stringify({ bookingId }),
    {
      ...COMMON_PARAMS,
      headers: authHeaders,
      tags: { name: "booking_flow_create_payment_intent", flow: "booking_revenue" },
    }
  );

  check(paymentIntentResponse, {
    "flow payment intent status 201": (r) => r.status === 201,
    "flow payment intent has clientSecret": (r) => {
      const parsed = safeJsonParse(r.body, {});
      return Boolean(parsed?.clientSecret && parsed?.paymentIntentId);
    },
  }, { flow: "booking_revenue" });

  sleepBetween(1, 2);
}
