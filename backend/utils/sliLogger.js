/**
 * SLI Metrics Logger Utility
 * 
 * Lightweight, production-safe logging of SLI events.
 * Use this in controllers and services to track:
 * - Latency (automatically via middleware)
 * - Booking/payment success
 * - Webhook processing
 * 
 * Usage:
 *   const { logBookingSuccess, logPaymentSuccess } = require('../utils/sliLogger');
 *   logBookingSuccess(bookingId, durationMs);
 *   logPaymentSuccess(paymentIntentId, durationMs);
 */

const logger = require("../config/logger");

/**
 * Log successful booking creation.
 * @param {number} bookingId - Booking ID
 * @param {number} durationMs - Time taken (ms)
 */
function logBookingSuccess(bookingId, durationMs) {
  logger.info("sli_booking_success", {
    event: "sli_booking_success",
    bookingId,
    durationMs,
    sli: {
      metric: "booking_success",
      value: 1,
      timestamp: Date.now(),
    },
  });
}

/**
 * Log failed booking creation (server error only; exclude 409 conflicts).
 * @param {number} bookingId - Booking ID
 * @param {number} durationMs - Time taken (ms)
 * @param {string} reason - Why it failed (e.g., "db_deadlock")
 */
function logBookingFailure(bookingId, durationMs, reason) {
  logger.error("sli_booking_failure", {
    event: "sli_booking_failure",
    bookingId,
    durationMs,
    reason,
    sli: {
      metric: "booking_success",
      value: 0,
      timestamp: Date.now(),
    },
  });
}

/**
 * Log successful payment intent creation.
 * @param {string} paymentIntentId - Stripe payment intent ID
 * @param {number} durationMs - Time taken (ms)
 */
function logPaymentSuccess(paymentIntentId, durationMs) {
  logger.info("sli_payment_success", {
    event: "sli_payment_success",
    paymentIntentId,
    durationMs,
    sli: {
      metric: "payment_success",
      value: 1,
      timestamp: Date.now(),
    },
  });
}

/**
 * Log failed payment intent creation (unrecoverable server error).
 * @param {string} paymentIntentId - Stripe payment intent ID (if available)
 * @param {number} durationMs - Time taken (ms)
 * @param {string} reason - Why it failed (e.g., "stripe_unavailable")
 */
function logPaymentFailure(paymentIntentId, durationMs, reason) {
  logger.error("sli_payment_failure", {
    event: "sli_payment_failure",
    paymentIntentId: paymentIntentId || null,
    durationMs,
    reason,
    sli: {
      metric: "payment_success",
      value: 0,
      timestamp: Date.now(),
    },
  });
}

/**
 * Log successful webhook processing.
 * @param {string} eventId - Stripe event ID
 * @param {string} eventType - Event type (e.g., "payment_intent.succeeded")
 * @param {number} durationMs - Processing time (ms)
 */
function logWebhookSuccess(eventId, eventType, durationMs) {
  logger.info("sli_webhook_success", {
    event: "sli_webhook_success",
    eventId,
    eventType,
    durationMs,
    sli: {
      metric: "webhook_success",
      value: 1,
      timestamp: Date.now(),
    },
  });
}

/**
 * Log failed webhook processing.
 * @param {string} eventId - Stripe event ID
 * @param {string} eventType - Event type
 * @param {number} durationMs - Processing time before failure (ms)
 * @param {string} reason - Why it failed (e.g., "db_deadlock_max_retries")
 */
function logWebhookFailure(eventId, eventType, durationMs, reason) {
  logger.error("sli_webhook_failure", {
    event: "sli_webhook_failure",
    eventId,
    eventType,
    durationMs,
    reason,
    sli: {
      metric: "webhook_success",
      value: 0,
      timestamp: Date.now(),
    },
  });
}

/**
 * Log guide search/matching operation.
 * @param {number} durationMs - Response time (ms)
 * @param {number} resultCount - Number of guides returned
 */
function logMatchingLatency(durationMs, resultCount) {
  logger.info("sli_matching_latency", {
    event: "sli_matching_latency",
    durationMs,
    resultCount,
    sli: {
      metric: "matching_latency_p95",
      value: durationMs,
      timestamp: Date.now(),
    },
  });
}

/**
 * Record API endpoint latency (used in middleware).
 * @param {string} endpoint - API path (e.g., "/api/guides")
 * @param {number} durationMs - Response time (ms)
 * @param {number} statusCode - HTTP status code
 */
function logEndpointLatency(endpoint, durationMs, statusCode) {
  const isCriticalPath = [
    "/api/guides",
    "/api/bookings",
    "/api/bookings/preview-pricing",
    "/api/payments/intent",
  ].includes(endpoint);

  logger.info("sli_endpoint_latency", {
    event: "sli_endpoint_latency",
    endpoint,
    durationMs,
    statusCode,
    isCriticalPath,
    sli: {
      metric: "latency_p95",
      value: durationMs,
      timestamp: Date.now(),
    },
  });
}

/**
 * Log availability/error event.
 * 0 = failure (5xx), 1 = success (2xx/3xx)
 * @param {string} endpoint - API path
 * @param {number} statusCode - HTTP status
 */
function logAvailability(endpoint, statusCode) {
  const isSuccess = statusCode < 400;

  logger.info("sli_availability", {
    event: "sli_availability",
    endpoint,
    statusCode,
    sli: {
      metric: "availability",
      value: isSuccess ? 1 : 0,
      timestamp: Date.now(),
    },
  });
}

module.exports = {
  logBookingSuccess,
  logBookingFailure,
  logPaymentSuccess,
  logPaymentFailure,
  logWebhookSuccess,
  logWebhookFailure,
  logMatchingLatency,
  logEndpointLatency,
  logAvailability,
};
