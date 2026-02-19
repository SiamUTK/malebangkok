import { validateBaseConfig } from "../config.js";
import { getSharedAuthHeaders } from "./auth.shared.js";
import {
  runAnonymousSession,
  runAuthenticatedBrowsingSession,
  runBookingAndPaymentSession,
} from "./shared.flows.js";

validateBaseConfig({ requiresAuth: true });

export const options = {
  scenarios: {
    spike_test: {
      executor: "ramping-vus",
      stages: [
        { duration: "5s", target: 50 },
        { duration: "30s", target: 500 },
        { duration: "5m", target: 500 },
        { duration: "5s", target: 0 },
      ],
      gracefulRampDown: "10s",
      tags: { traffic_segment: "spike" },
    },
  },
  thresholds: {
    // Spike tolerance: error rate can go up to 10%, p(99) can degrade to 5s
    http_req_failed: ["rate < 0.10"],
    http_req_duration: ["p(95) < 3000", "p(99) < 5000"],
    "http_req_duration{endpoint:guides_list}": ["p(95) < 1500"],
    "http_req_duration{endpoint:guides_match}": ["p(95) < 3500"],
    "http_req_duration{endpoint:booking_create}": ["p(95) < 4000"],
    "http_req_duration{endpoint:payments_intent_create}": ["p(95) < 4000"],
  },
  tags: {
    suite: "advanced-spike",
    environment: __ENV.ENVIRONMENT || "production-like",
  },
};

export function setup() {
  // Pre-authenticate to ensure auth tokens available for spike phase
  const authHeaders = getSharedAuthHeaders();
  return { authHeaders };
}

export default function (data) {
  const { authHeaders } = data;
  
  // Mix of traffic during spike
  const randChoice = Math.random();
  if (randChoice < 0.50) {
    runAnonymousSession();
  } else if (randChoice < 0.85) {
    runAuthenticatedBrowsingSession(authHeaders);
  } else {
    runBookingAndPaymentSession(authHeaders);
  }
}
