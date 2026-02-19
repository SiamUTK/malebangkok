import http from "k6/http";
import { check, fail } from "k6";
import { BASE_URL, COMMON_PARAMS, TEST_USER_EMAIL, TEST_USER_PASSWORD } from "./config.js";

const tokenCacheByVu = new Map();

function truncateBody(body, maxLength = 600) {
  const text = String(body || "");
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

export function loginAndGetToken({ forceRefresh = false } = {}) {
  const vuKey = String(__VU || 0);

  if (!forceRefresh && tokenCacheByVu.has(vuKey)) {
    return tokenCacheByVu.get(vuKey);
  }

  const payload = JSON.stringify({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  });

  const response = http.post(`${BASE_URL}/api/auth/login`, payload, {
    ...COMMON_PARAMS,
    tags: { name: "auth_login" },
  });

  const ok = check(response, {
    "auth login status 200": (r) => r.status === 200,
    "auth login has token": (r) => {
      try {
        const parsed = JSON.parse(r.body || "{}");
        return Boolean(parsed?.token);
      } catch {
        return false;
      }
    },
  });

  if (!ok) {
    const message = `Login failed. status=${response.status} body=${truncateBody(response.body)}`;
    console.error(`[auth] ${message}`);
    fail(message);
  }

  const token = JSON.parse(response.body).token;
  tokenCacheByVu.set(vuKey, token);
  return token;
}

export function getAuthHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export function clearVuTokenCache() {
  tokenCacheByVu.delete(String(__VU || 0));
}
