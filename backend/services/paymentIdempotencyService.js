const { query } = require("../config/db");
const logger = require("../config/logger");

const SUCCESS_STATUSES = new Set(["succeeded", "paid"]);

function isSucceededStatus(status) {
  return SUCCESS_STATUSES.has(String(status || "").toLowerCase());
}

async function hasPaymentSucceeded(paymentIntentId) {
  const rows = await query(
    `
      SELECT id, status, booking_id
      FROM payments
      WHERE stripe_payment_intent_id = ?
      LIMIT 1
    `,
    [paymentIntentId]
  );

  if (!rows[0]) {
    return {
      exists: false,
      succeeded: false,
      payment: null,
    };
  }

  return {
    exists: true,
    succeeded: isSucceededStatus(rows[0].status),
    payment: rows[0],
  };
}

async function markPaymentProcessingAtomic({
  connection,
  paymentIntentId,
  bookingIdFromMetadata,
}) {
  const [paymentRows] = await connection.execute(
    `
      SELECT id, booking_id, user_id, guide_id, amount, status
      FROM payments
      WHERE stripe_payment_intent_id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [paymentIntentId]
  );

  if (!paymentRows[0]) {
    return {
      shouldExit: true,
      reason: "payment_not_found",
    };
  }

  const payment = paymentRows[0];

  if (isSucceededStatus(payment.status)) {
    return {
      shouldExit: true,
      reason: "payment_already_succeeded",
      payment,
    };
  }

  const bookingId = Number(payment.booking_id || bookingIdFromMetadata);

  const [bookingRows] = await connection.execute(
    `
      SELECT id, status, payment_status
      FROM bookings
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [bookingId]
  );

  if (!bookingRows[0]) {
    return {
      shouldExit: true,
      reason: "booking_not_found",
      payment,
    };
  }

  const booking = bookingRows[0];

  if (String(booking.status).toLowerCase() === "confirmed") {
    return {
      shouldExit: true,
      reason: "booking_already_confirmed",
      payment,
      booking,
    };
  }

  return {
    shouldExit: false,
    payment,
    booking,
  };
}

function safeIdempotentExit({
  paymentIntentId,
  bookingId,
  eventType,
  reason,
  attempt,
  metadata,
}) {
  logger.info("stripe_webhook_idempotent_skip", {
    event: "stripe_webhook_idempotent_skip",
    eventType,
    paymentIntentId,
    bookingId: bookingId || null,
    reason,
    attempt: attempt || null,
    metadata: metadata || null,
  });

  return {
    skipped: true,
    reason,
  };
}

module.exports = {
  hasPaymentSucceeded,
  markPaymentProcessingAtomic,
  safeIdempotentExit,
};
