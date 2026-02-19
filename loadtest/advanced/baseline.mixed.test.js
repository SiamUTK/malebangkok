import { validateBaseConfig } from "../config.js";
import { getSharedAuthHeaders } from "./auth.shared.js";
import {
  runAnonymousSession,
  runAuthenticatedBrowsingSession,
  runBookingAndPaymentSession,
} from "./shared.flows.js";

validateBaseConfig({ requiresAuth: true });

const ANON_RATE = Number(__ENV.BASELINE_ANON_RATE || 6);
const AUTH_RATE = Number(__ENV.BASELINE_AUTH_RATE || 4);
const REVENUE_RATE = Number(__ENV.BASELINE_REVENUE_RATE || 1);

export const options = {
  scenarios: {
    anonymous_browsing: {
      executor: "constant-arrival-rate",
      rate: ANON_RATE,
      timeUnit: "1s",
      duration: __ENV.BASELINE_DURATION || "15m",
      preAllocatedVUs: Number(__ENV.BASELINE_ANON_PRE_VUS || 20),
      maxVUs: Number(__ENV.BASELINE_ANON_MAX_VUS || 80),
      exec: "anonymousFlow",
      tags: { traffic_segment: "anonymous" },
    },
    authenticated_browsing: {
      executor: "constant-arrival-rate",
      rate: AUTH_RATE,
      timeUnit: "1s",
      duration: __ENV.BASELINE_DURATION || "15m",
      preAllocatedVUs: Number(__ENV.BASELINE_AUTH_PRE_VUS || 20),
      maxVUs: Number(__ENV.BASELINE_AUTH_MAX_VUS || 80),
      exec: "authenticatedFlow",
      tags: { traffic_segment: "authenticated" },
    },
    revenue_path: {
      executor: "constant-arrival-rate",
      rate: REVENUE_RATE,
      timeUnit: "1s",
      duration: __ENV.BASELINE_DURATION || "15m",
      preAllocatedVUs: Number(__ENV.BASELINE_REV_PRE_VUS || 10),
      maxVUs: Number(__ENV.BASELINE_REV_MAX_VUS || 50),
      exec: "revenueFlow",
      tags: { traffic_segment: "revenue" },
    },
  },
  thresholds: {
    http_req_failed: ["rate < 0.02"],
    http_req_duration: ["p(95) < 1200", "p(99) < 2500"],
    "http_req_duration{endpoint:guides_list}": ["p(95) < 900"],
    "http_req_duration{endpoint:guide_profile}": ["p(95) < 1000"],
    "http_req_duration{endpoint:guides_match}": ["p(95) < 1800"],
    "http_req_duration{endpoint:booking_create}": ["p(95) < 2200"],
    "http_req_duration{endpoint:payments_intent_create}": ["p(95) < 2200"],
  },
  tags: {
    suite: "advanced-baseline-mixed",
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
