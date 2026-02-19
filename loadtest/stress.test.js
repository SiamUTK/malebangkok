import http from "k6/http";
import { check, group, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "https://malebangkok.com";

export const options = {
  stages: [
    { duration: "1m", target: 50 },
    { duration: "1m", target: 100 },
    { duration: "1m", target: 150 },
    { duration: "1m", target: 200 },
    { duration: "1m", target: 250 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95) < 2000", "p(99) < 5000"],
    http_req_failed: ["rate < 0.05"],
  },
  tags: {
    test: "stress",
    environment: "production",
  },
};

export default function () {
  const testType = Math.random();

  if (testType < 0.6) {
    group("stress_guides", () => {
      const res = http.get(`${BASE_URL}/api/guides`, {
        tags: { name: "guides_list" },
      });

      check(res, {
        "guides: status 200": (r) => r.status === 200,
        "guides: returned data": (r) => r.body.length > 0,
        "guides: latency reasonable": (r) => r.timings.duration < 3000,
      });
    });
  } else if (testType < 0.85) {
    group("stress_health", () => {
      const res = http.get(`${BASE_URL}/api/health`, {
        tags: { name: "health_check" },
      });

      check(res, {
        "health: status 200": (r) => r.status === 200,
        "health: response < 1s": (r) => r.timings.duration < 1000,
      });
    });
  } else {
    group("stress_matching", () => {
      const payload = {
        location: "Bangkok",
        preferences: ["Cultural tours"],
        maxGuides: 10,
        language: "English",
      };

      const res = http.post(
        `${BASE_URL}/api/guides/match`,
        JSON.stringify(payload),
        {
          headers: { "Content-Type": "application/json" },
          tags: { name: "guides_match" },
        }
      );

      check(res, {
        "match: no 500 errors": (r) => r.status < 500,
        "match: completes": (r) => r.body.length > 0 || r.status === 400,
      });
    });
  }

  sleep(Math.random() * 1 + 0.5);
}
