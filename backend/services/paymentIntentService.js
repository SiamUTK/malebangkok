const { pool, query } = require("../config/db");
const { stripe } = require("../config/stripe");
const logger = require("../config/logger");
const { AppError } = require("../middleware/errorMiddleware");

const ACTIVE_PAYMENT_STATUSES = Object.freeze([
  "initiated",
  "processing",
  // Backward-compatible statuses used in current schema.
  "pending",
  "requires_action",
]);

const TERMINAL_PAYMENT_STATUSES = Object.freeze(["succeeded", "failed", "cancelled"]);

function getStablePaymentIntentIdempotencyKey(bookingId) {
  // Stable per booking across retries/network failures: same booking => same Stripe idempotency scope.
  return `booking:${bookingId}`;
}

function mapIntentStatusToDbStatus(stripeIntentStatus) {
  const normalizedStatus = String(stripeIntentStatus || "").toLowerCase();

  if (normalizedStatus === "succeeded") {
    return "succeeded";
  }

  if (normalizedStatus === "canceled") {
    return "failed";
  }

  return "pending";
}

async function findActivePaymentIntentByBooking(bookingId) {
  const normalizedBookingId = Number(bookingId);
  if (!Number.isFinite(normalizedBookingId) || normalizedBookingId <= 0) {
    throw new Error("Invalid bookingId for findActivePaymentIntentByBooking");
  }

  const placeholders = ACTIVE_PAYMENT_STATUSES.map(() => "?").join(", ");
  const rows = await query(
    `
      SELECT id, booking_id, stripe_payment_intent_id, status, created_at
      FROM payments
      WHERE booking_id = ?
        AND status IN (${placeholders})
      ORDER BY id DESC
      LIMIT 1
    `,
    [normalizedBookingId, ...ACTIVE_PAYMENT_STATUSES]
  );

  return rows[0] || null;
}

async function createOrReusePaymentIntentAtomic({
  bookingId,
  amount,
  currency,
  metadata,
}) {
  if (!stripe) {
    throw new AppError("Stripe is not configured", 503);
  }

  const normalizedBookingId = Number(bookingId);
  const normalizedAmount = Number(amount);
  const normalizedCurrency = String(currency || "thb").toLowerCase();

  if (!Number.isFinite(normalizedBookingId) || normalizedBookingId <= 0) {
    throw new Error("Invalid bookingId for createOrReusePaymentIntentAtomic");
  }

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error("Invalid amount for createOrReusePaymentIntentAtomic");
  }

  const amountInMinorUnit = Math.round(normalizedAmount * 100);
  if (amountInMinorUnit <= 0) {
    throw new Error("Amount must be greater than zero for createOrReusePaymentIntentAtomic");
  }

  const idempotencyKey = getStablePaymentIntentIdempotencyKey(normalizedBookingId);

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Lock booking row to serialize payment intent creation for the same booking.
    const [bookingRows] = await connection.execute(
      `
        SELECT id, user_id, guide_id, payment_status, status
        FROM bookings
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [normalizedBookingId]
    );

    const booking = bookingRows[0];
    if (!booking) {
      throw new AppError("Booking not found", 404);
    }

    const placeholders = ACTIVE_PAYMENT_STATUSES.map(() => "?").join(", ");
    const [activeRows] = await connection.execute(
      `
        SELECT id, stripe_payment_intent_id, status
        FROM payments
        WHERE booking_id = ?
          AND status IN (${placeholders})
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE
      `,
      [normalizedBookingId, ...ACTIVE_PAYMENT_STATUSES]
    );

    if (activeRows[0]) {
      const activePayment = activeRows[0];

      await connection.execute(
        `
          UPDATE bookings
          SET payment_intent_id = ?,
              payment_status = 'requires_payment',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [activePayment.stripe_payment_intent_id, normalizedBookingId]
      );

      await connection.commit();

      const existingIntent = await stripe.paymentIntents.retrieve(activePayment.stripe_payment_intent_id);

      logger.info("payment_intent_reused", {
        event: "payment_intent_reused",
        bookingId: normalizedBookingId,
        paymentIntentId: activePayment.stripe_payment_intent_id,
        idempotencyKey,
        activeStatuses: ACTIVE_PAYMENT_STATUSES,
        terminalStatuses: TERMINAL_PAYMENT_STATUSES,
      });

      return {
        reused: true,
        paymentIntentId: existingIntent.id,
        clientSecret: existingIntent.client_secret,
        status: activePayment.status,
      };
    }

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountInMinorUnit,
          currency: normalizedCurrency,
          metadata,
          automatic_payment_methods: {
            enabled: true,
          },
        },
        {
          // Required stable key: idempotencyKey = "booking:{bookingId}"
          idempotencyKey,
        }
      );
    } catch (stripeError) {
      logger.error("payment_intent_create_failed", {
        event: "payment_intent_create_failed",
        bookingId: normalizedBookingId,
        idempotencyKey,
        message: stripeError.message,
        type: stripeError.type,
      });
      throw stripeError;
    }

    const persistedStatus = mapIntentStatusToDbStatus(paymentIntent.status);

    await connection.execute(
      `
        INSERT INTO payments (
          booking_id,
          user_id,
          guide_id,
          amount,
          currency,
          stripe_payment_intent_id,
          status,
          provider_payload
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        normalizedBookingId,
        booking.user_id,
        booking.guide_id,
        normalizedAmount,
        normalizedCurrency,
        paymentIntent.id,
        persistedStatus,
        JSON.stringify(paymentIntent),
      ]
    );

    await connection.execute(
      `
        UPDATE bookings
        SET payment_intent_id = ?,
            payment_status = 'requires_payment',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [paymentIntent.id, normalizedBookingId]
    );

    await connection.commit();

    logger.info("payment_intent_created", {
      event: "payment_intent_created",
      bookingId: normalizedBookingId,
      paymentIntentId: paymentIntent.id,
      idempotencyKey,
      activeStatuses: ACTIVE_PAYMENT_STATUSES,
      terminalStatuses: TERMINAL_PAYMENT_STATUSES,
    });

    return {
      reused: false,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: persistedStatus,
    };
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        logger.error("payment_intent_tx_rollback_failed", {
          event: "payment_intent_tx_rollback_failed",
          bookingId: normalizedBookingId,
          message: rollbackError.message,
        });
      }
    }

    if (error?.type === "StripeConnectionError" || error?.type === "StripeAPIError") {
      throw new AppError("Unable to create payment intent right now", 502);
    }

    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = {
  ACTIVE_PAYMENT_STATUSES,
  TERMINAL_PAYMENT_STATUSES,
  findActivePaymentIntentByBooking,
  createOrReusePaymentIntentAtomic,
};
