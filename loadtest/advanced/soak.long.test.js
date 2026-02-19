import { validateBaseConfig } from "../config.js";
import { getSharedAuthHeaders } from "./auth.shared.js";
import {
  runAnonymousSession,
  runAuthenticatedBrowsingSession,
  runBookingAndPaymentSession,
} from "./shared.flows.js";

validateBaseConfig({ requiresAuth: true });

const SOAK_TARGET_VUS = Number(__ENV.SOAK_TARGET_VUS || 50);
const SOAK_RAMP_UP_MINUTES = Number(__ENV.SOAK_RAMP_UP_MINUTES || 10);
const SOAK_HOLD_MINUTES = Number(__ENV.SOAK_HOLD_MINUTES || 30);
const SOAK_RAMP_DOWN_MINUTES = Number(__ENV.SOAK_RAMP_DOWN_MINUTES || 10);

export const options = {
  scenarios: {
    soak_test: {
      executor: "ramping-vus",
      stages: [
        // Ramp up gradually to avoid startup shock
        { duration: `${SOAK_RAMP_UP_MINUTES}m`, target: SOAK_TARGET_VUS },
        // Hold steady state for extended period to detect memory leaks, connection degradation
        { duration: `${SOAK_HOLD_MINUTES}m`, target: SOAK_TARGET_VUS },
        // Graceful ramp down
        { duration: `${SOAK_RAMP_DOWN_MINUTES}m`, target: 0 },
      ],
      gracefulRampDown: "30s",
      tags: { traffic_segment: "soak" },
    },
  },
  thresholds: {
    // Soak: expect stable performance throughout; any degradation is a failure signal
    http_req_failed: ["rate < 0.02"],
    http_req_duration: ["p(95) < 1500", "p(99) < 3000"],
    "http_req_duration{endpoint:guides_list}": ["p(95) < 1000"],
    "http_req_duration{endpoint:guides_match}": ["p(95) < 2000"],
    "http_req_duration{endpoint:booking_create}": ["p(95) < 2500"],
    "http_req_duration{endpoint:payments_intent_create}": ["p(95) < 2500"],
  },
  tags: {
    suite: "advanced-soak-long",
    environment: __ENV.ENVIRONMENT || "production-like",
  },
};

export function setup() {
  // Pre-authenticate once for all VUs
  const authHeaders = getSharedAuthHeaders();
  return { authHeaders };
}

export default function (data) {
  const { authHeaders } = data;
  
  // Realistic traffic distribution during soak:
  // - 55% anonymous browsing
  // - 35% authenticated browsing
  // - 10% revenue path
  const randChoice = Math.random();
  if (randChoice < 0.55) {
    runAnonymousSession();
  } else if (randChoice < 0.90) {
    runAuthenticatedBrowsingSession(authHeaders);
  } else {
    runBookingAndPaymentSession(authHeaders);
  }
}
