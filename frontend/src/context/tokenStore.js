const STORAGE_KEY = "mb_access_token";
const persistMode = import.meta.env.VITE_AUTH_PERSISTENCE || "session";

let accessToken = "";

if (persistMode === "session") {
  accessToken = sessionStorage.getItem(STORAGE_KEY) || "";
}

function setAccessToken(token) {
  accessToken = token || "";
  if (persistMode === "session") {
    if (accessToken) {
      sessionStorage.setItem(STORAGE_KEY, accessToken);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }
}

function getAccessToken() {
  return accessToken;
}

function clearAccessToken() {
  setAccessToken("");
}

export {
  setAccessToken,
  getAccessToken,
  clearAccessToken,
};