import { getAuthHeaders, loginAndGetToken } from "../auth.js";

export function getSharedAuthHeaders({ forceRefresh = false } = {}) {
  const token = loginAndGetToken({ forceRefresh });
  return getAuthHeaders(token);
}
