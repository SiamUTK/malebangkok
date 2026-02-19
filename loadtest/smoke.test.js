import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "https://malebangkok.com";

export const options = {
  stages: [
    { duration: "30s", target: 1 },
  ],
  thresholds: {
    http_req_duration: ["p(95) < 1000", "p(99) < 2000"],
    http_req_failed: ["rate < 0.1"],
  },
  tags: {
    test: "smoke",
  },
};

export default function () {
  const healthRes = http.get(`${BASE_URL}/api/health`, {
    tags: { name: "health_check" },
  });

  check(healthRes, {
    "health: status is 200": (r) => r.status === 200,
    "health: response time < 1000ms": (r) => r.timings.duration < 1000,
    "health: has database field": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.database !== undefined;
      } catch {
        return false;
      }
    },
  });

  sleep(2);

  const guidesRes = http.get(`${BASE_URL}/api/guides`, {
    tags: { name: "guides_list" },
  });

  check(guidesRes, {
    "guides: status is 200": (r) => r.status === 200,
    "guides: response time < 1000ms": (r) => r.timings.duration < 1000,
    "guides: returns array": (r) => {
      try {
        return Array.isArray(JSON.parse(r.body));
      } catch {
        return false;
      }
    },
  });

  sleep(2);
}
