import http from "k6/http";
import { check, group, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "https://malebangkok.com";

export const options = {
  stages: [
    { duration: "1m", target: 10 },
    { duration: "2m", target: 50 },
    { duration: "2m", target: 50 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95) < 800", "p(99) < 1500"],
    http_req_failed: ["rate < 0.01"],
    "group_duration{group:::guides_get}": ["p(95) < 1000"],
    "group_duration{group:::matching_post}": ["p(95) < 2000"],
  },
  tags: {
    test: "load",
    environment: "production",
  },
};

const matchRequestPayload = {
  location: "Bangkok",
  preferences: [
    "Historical tours",
    "Food tours",
    "Temple visits",
  ],
  maxGuides: 5,
  language: "English",
};

export default function () {
  const random = Math.random();

  if (random < 0.7) {
    group("guides_get", () => {
      const res = http.get(`${BASE_URL}/api/guides`, {
        tags: { name: "guides_list" },
      });

      check(res, {
        "guides: status is 200": (r) => r.status === 200,
        "guides: response time < 800ms": (r) => r.timings.duration < 800,
        "guides: response has body": (r) => r.body.length > 0,
      });
    });
  } else if (random < 0.9) {
    group("health_check", () => {
      const res = http.get(`${BASE_URL}/api/health`, {
        tags: { name: "health_check" },
      });

      check(res, {
        "health: status is 200": (r) => r.status === 200,
        "health: response time < 500ms": (r) => r.timings.duration < 500,
      });
    });
  } else {
    group("matching_post", () => {
      const res = http.post(
        `${BASE_URL}/api/guides/match`,
        JSON.stringify(matchRequestPayload),
        {
          headers: {
            "Content-Type": "application/json",
          },
          tags: { name: "guides_match" },
        }
      );

      check(res, {
        "match: status is 200 or 400": (r) => r.status === 200 || r.status === 400,
        "match: response time < 2000ms": (r) => r.timings.duration < 2000,
        "match: no 500 errors": (r) => r.status < 500,
      });
    });
  }

  sleep(Math.random() * 2 + 1);
}
