export function normalizeApiError(error, fallbackMessage = "Something went wrong. Please try again.") {
  const payload = error?.response?.data;

  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    return payload.errors.map((item) => item.message).join(" ");
  }

  return payload?.message || error?.message || fallbackMessage;
}
