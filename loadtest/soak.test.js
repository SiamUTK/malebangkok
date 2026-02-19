import http from "k6/http";
import { check, group, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "https://malebangkok.com";

export const options = {
  stages: [
    { duration: "5m", target: 20 },
    { duration: "30m", target: 20 },
    { duration: "5m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95) < 1000", "p(99) < 2000"],
    http_req_failed: ["rate < 0.01"],
  },
  tags: {
    test: "soak",
    environment: "production",
  },
};

export default function () {
  const random = Math.random();

  if (random < 0.7) {
    group("soak_guides", () => {
      const res = http.get(`${BASE_URL}/api/guides`, {
        tags: { name: "guides_list" },
      });

      check(res, {
        "guides: status is 200": (r) => r.status === 200,
        "guides: response time < 1000ms": (r) => r.timings.duration < 1000,
        "guides: data returned": (r) => r.body.length > 0,
      });
    });
  } else if (random < 0.9) {
    group("soak_health", () => {
      const res = http.get(`${BASE_URL}/api/health`, {
        tags: { name: "health_check" },
      });

      check(res, {
        "health: status is 200": (r) => r.status === 200,
        "health: response time < 500ms": (r) => r.timings.duration < 500,
        "health: db connected": (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.database === "connected";
          } catch {
            return false;
          }
        },
      });
    });
  } else {
    group("soak_matching", () => {
      const payload = {
        location: "Bangkok",
        preferences: ["City tours", "Food tours"],
        maxGuides: 5,
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
        "match: status success or client error": (r) =>
          (r.status >= 200 && r.status < 500),
        "match: no 500+ errors": (r) => r.status < 500,
        "match: response < 2s": (r) => r.timings.duration < 2000,
      });
    });
  }

  sleep(Math.random() * 3 + 1);
}
