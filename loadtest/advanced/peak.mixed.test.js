import { validateBaseConfig } from "../config.js";
import { getSharedAuthHeaders } from "./auth.shared.js";
import {
  runAnonymousSession,
  runAuthenticatedBrowsingSession,
  runBookingAndPaymentSession,
} from "./shared.flows.js";

validateBaseConfig({ requiresAuth: true });

const PEAK_ANON_RATE = Number(__ENV.PEAK_ANON_RATE || 18);
const PEAK_AUTH_RATE = Number(__ENV.PEAK_AUTH_RATE || 12);
const PEAK_REVENUE_RATE = Number(__ENV.PEAK_REVENUE_RATE || 4);

export const options = {
  scenarios: {
    anonymous_browsing: {
      executor: "constant-arrival-rate",
      rate: PEAK_ANON_RATE,
      timeUnit: "1s",
      duration: __ENV.PEAK_DURATION || "20m",
      preAllocatedVUs: Number(__ENV.PEAK_ANON_PRE_VUS || 60),
      maxVUs: Number(__ENV.PEAK_ANON_MAX_VUS || 200),
      exec: "anonymousFlow",
      tags: { traffic_segment: "anonymous" },
    },
    authenticated_browsing: {
      executor: "constant-arrival-rate",
      rate: PEAK_AUTH_RATE,
      timeUnit: "1s",
      duration: __ENV.PEAK_DURATION || "20m",
      preAllocatedVUs: Number(__ENV.PEAK_AUTH_PRE_VUS || 50),
      maxVUs: Number(__ENV.PEAK_AUTH_MAX_VUS || 180),
      exec: "authenticatedFlow",
      tags: { traffic_segment: "authenticated" },
    },
    revenue_path: {
      executor: "constant-arrival-rate",
      rate: PEAK_REVENUE_RATE,
      timeUnit: "1s",
      duration: __ENV.PEAK_DURATION || "20m",
      preAllocatedVUs: Number(__ENV.PEAK_REV_PRE_VUS || 30),
      maxVUs: Number(__ENV.PEAK_REV_MAX_VUS || 120),
      exec: "revenueFlow",
      tags: { traffic_segment: "revenue" },
    },
  },
  thresholds: {
    http_req_failed: ["rate < 0.05"],
    http_req_duration: ["p(95) < 2000", "p(99) < 4000"],
    "http_req_duration{endpoint:guides_list}": ["p(95) < 1200"],
    "http_req_duration{endpoint:guide_profile}": ["p(95) < 1500"],
    "http_req_duration{endpoint:guides_match}": ["p(95) < 2500"],
    "http_req_duration{endpoint:booking_create}": ["p(95) < 3000"],
    "http_req_duration{endpoint:payments_intent_create}": ["p(95) < 3000"],
  },
  tags: {
    suite: "advanced-peak-mixed",
    environment: __ENV.ENVIRONMENT || "production-like",
  },
};

export function anonymousFlow() {
  runAnonymousSession();
}

export function authenticatedFlow() {
  const authHeaders = getSharedAuthHeaders();
  runAuthenticatedBrowsingSession(authHeaders);
}

export function revenueFlow() {
  const authHeaders = getSharedAuthHeaders();
  runBookingAndPaymentSession(authHeaders);
}
