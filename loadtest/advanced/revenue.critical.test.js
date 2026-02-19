import { validateBaseConfig } from "../config.js";
import { getSharedAuthHeaders } from "./auth.shared.js";
import { runBookingAndPaymentSession } from "./shared.flows.js";

validateBaseConfig({ requiresAuth: true });

const REVENUE_CRITICAL_RATE = Number(__ENV.REVENUE_CRITICAL_RATE || 10);

export const options = {
  scenarios: {
    revenue_critical: {
      executor: "constant-arrival-rate",
      rate: REVENUE_CRITICAL_RATE,
      timeUnit: "1s",
      duration: __ENV.REVENUE_CRITICAL_DURATION || "20m",
      preAllocatedVUs: Number(__ENV.REVENUE_CRITICAL_PRE_VUS || 80),
      maxVUs: Number(__ENV.REVENUE_CRITICAL_MAX_VUS || 300),
      exec: "criticalRevenueFlow",
      tags: { traffic_segment: "revenue_critical" },
    },
  },
  thresholds: {
    // Revenue path is business critical: very tight SLOs
    http_req_failed: ["rate < 0.01"],  // <1% error rate
    http_req_duration: ["p(95) < 2500", "p(99) < 4000"],
    "http_req_duration{endpoint:guides_list}": ["p(95) < 1000"],
    "http_req_duration{endpoint:guides_match}": ["p(95) < 2000"],
    "http_req_duration{endpoint:booking_create}": ["p(95) < 2200"],
    "http_req_duration{endpoint:payments_intent_create}": ["p(95) < 2500"],
    // Critical: booking success rate must be high (each failed booking = lost revenue)
    "http_res_status{endpoint:booking_create,status:200}": ["count > 0"],
    "http_res_status{endpoint:payments_intent_create,status:200}": ["count > 0"],
  },
  tags: {
    suite: "advanced-revenue-critical",
    environment: __ENV.ENVIRONMENT || "production-like",
  },
};

export function criticalRevenueFlow() {
  const authHeaders = getSharedAuthHeaders();
  // 100% of traffic is revenue path: booking creation + payment intent
  runBookingAndPaymentSession(authHeaders);
}
