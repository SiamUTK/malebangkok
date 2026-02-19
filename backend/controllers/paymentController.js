const nodemailer = require("nodemailer");
const { stripe, stripeWebhookSecret } = require("../config/stripe");
const logger = require("../config/logger");
const { pool } = require("../config/db");
const { AppError } = require("../middleware/errorMiddleware");
const { getBookingById } = require("../models/bookingModel");
const { updatePaymentStatusByIntent } = require("../models/paymentModel");
const { calculateCommission } = require("../services/commissionService");
const {
  hasPaymentSucceeded,
  markPaymentProcessingAtomic,
  safeIdempotentExit,
} = require("../services/paymentIdempotencyService");
const { createOrReusePaymentIntentAtomic } = require("../services/paymentIntentService");
const { findUserById } = require("../models/userModel");
const { sendHighAlert, sendWarning } = require("../services/alertService");
const {
  enqueueGuideStatsUpdate,
  enqueueAnalyticsEvent,
  enqueueReconciliationRun,
  enqueueEmailNotification,
} = require("../services/jobProducerService");

const MAX_WEBHOOK_TX_RETRIES = 3;
const RETRIABLE_DB_ERROR_CODES = new Set(["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"]);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetriableDbError(error) {
  return RETRIABLE_DB_ERROR_CODES.has(error?.code);
}

function getTransporter() {
  if (!process.env.SMTP_HOST) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendBookingPaidEmail({ to, bookingId, amount }) {
  const transporter = getTransporter();
  if (!transporter || !to) {
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "no-reply@malebangkok.com",
    to,
    subject: "MaleBangkok Booking Confirmed",
    text: `Your booking #${bookingId} has been confirmed. Paid amount: THB ${amount}.`,
  });
}

async function createPaymentIntentHandler(req, res, next) {
  try {
    if (!stripe) {
      throw new AppError("Stripe is not configured", 503);
    }

    const bookingId = Number(req.body.bookingId);
    const booking = await getBookingById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (booking.payment_status === "paid") {
      throw new AppError("Booking already paid", 409);
    }

    if (booking.status !== "pending") {
      throw new AppError("Only pending bookings can be paid", 409);
    }

    const paymentIntentState = await createOrReusePaymentIntentAtomic({
      bookingId: booking.id,
      amount: booking.total_price,
      currency: "thb",
      metadata: {
        bookingId: String(booking.id),
        userId: String(booking.user_id),
        guideId: String(booking.guide_id),
      },
    });

    logger.info("payment_intent_ready", {
      event: "payment_intent_ready",
      bookingId: booking.id,
      userId: req.user?.id,
      paymentIntentId: paymentIntentState.paymentIntentId,
      reused: paymentIntentState.reused,
    });

    return res.status(201).json({
      message: "Payment intent created",
      clientSecret: paymentIntentState.clientSecret,
      paymentIntentId: paymentIntentState.paymentIntentId,
    });
  } catch (error) {
    return next(error);
  }
}

async function stripeWebhookHandler(req, res, next) {
  try {
    if (!stripe || !stripeWebhookSecret) {
      throw new AppError("Stripe webhook is not configured", 503);
    }

    const signature = req.headers["stripe-signature"];
    if (!signature) {
      throw new AppError("Missing Stripe signature", 400);
    }

    const event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const bookingId = Number(paymentIntent.metadata.bookingId);

      const preCheck = await hasPaymentSucceeded(paymentIntent.id);
      if (preCheck.succeeded) {
        safeIdempotentExit({
          paymentIntentId: paymentIntent.id,
          bookingId,
          eventType: event.type,
          reason: "payment_already_succeeded_precheck",
        });
        return res.status(200).json({ received: true });
      }

      let committedPayment = null;

      for (let attempt = 1; attempt <= MAX_WEBHOOK_TX_RETRIES; attempt += 1) {
        let connection;
        try {
          connection = await pool.getConnection();
          await connection.beginTransaction();

          // Row locks serialize retries/concurrent deliveries for the same payment+booking.
          const idempotencyState = await markPaymentProcessingAtomic({
            connection,
            paymentIntentId: paymentIntent.id,
            bookingIdFromMetadata: bookingId,
          });

          if (idempotencyState.shouldExit) {
            await connection.rollback();
            safeIdempotentExit({
              paymentIntentId: paymentIntent.id,
              bookingId,
              eventType: event.type,
              reason: idempotencyState.reason,
              attempt,
            });
            return res.status(200).json({ received: true });
          }

          const payment = idempotencyState.payment;
          const commission = calculateCommission({ bookingTotal: payment.amount });

          await connection.execute(
            `
              UPDATE payments
              SET status = 'succeeded',
                  provider_payload = ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `,
            [JSON.stringify(paymentIntent), payment.id]
          );

          await connection.execute(
            `
              UPDATE bookings
              SET status = 'confirmed',
                  payment_status = 'paid',
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `,
            [payment.booking_id]
          );

          // Lock existing commission row (if any) to prevent duplicate settlement writes.
          await connection.execute(
            `
              SELECT id
              FROM commissions
              WHERE booking_id = ?
              LIMIT 1
              FOR UPDATE
            `,
            [payment.booking_id]
          );

          await connection.execute(
            `
              INSERT INTO commissions (
                booking_id,
                guide_id,
                gross_amount,
                platform_rate,
                platform_amount,
                guide_amount,
                status
              )
              VALUES (?, ?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE
                gross_amount = VALUES(gross_amount),
                platform_rate = VALUES(platform_rate),
                platform_amount = VALUES(platform_amount),
                guide_amount = VALUES(guide_amount),
                status = VALUES(status),
                updated_at = CURRENT_TIMESTAMP
            `,
            [
              payment.booking_id,
              payment.guide_id,
              payment.amount,
              commission.platformRate,
              commission.platformAmount,
              commission.guideAmount,
              "settled",
            ]
          );

          try {
            await connection.execute(
              `
                INSERT INTO guide_performance_stats (guide_id, total_bookings, last_booked, last_updated)
                VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE
                  total_bookings = total_bookings + 1,
                  last_booked = CURRENT_TIMESTAMP,
                  last_updated = CURRENT_TIMESTAMP
              `,
              [String(payment.guide_id)]
            );
          } catch (statsError) {
            if (statsError.code !== "ER_NO_SUCH_TABLE") {
              throw statsError;
            }

            logger.warn("guide_performance_stats_table_missing", {
              event: "guide_performance_stats_table_missing",
              paymentIntentId: paymentIntent.id,
              bookingId: payment.booking_id,
            });
          }

          await connection.commit();
          committedPayment = payment;
          break;
        } catch (error) {
          if (connection) {
            try {
              await connection.rollback();
            } catch (rollbackError) {
              logger.error("stripe_webhook_rollback_failed", {
                message: rollbackError.message,
                paymentIntentId: paymentIntent.id,
              });
            }
          }

          if (isRetriableDbError(error) && attempt < MAX_WEBHOOK_TX_RETRIES) {
            logger.warn("stripe_webhook_retry", {
              event: "stripe_webhook_retry",
              reason: error.code,
              paymentIntentId: paymentIntent.id,
              bookingId,
              attempt,
            });
            await sleep(attempt * 120);
            continue;
          }

          throw error;
        } finally {
          if (connection) {
            connection.release();
          }
        }
      }

      if (!committedPayment) {
        Promise.resolve(
          sendHighAlert({
            event: "payment_anomaly_uncommitted",
            title: "Payment anomaly: webhook could not commit",
            message: "payment_intent.succeeded received but commit did not complete safely",
            requestId: req.requestId || null,
            path: req.originalUrl,
            method: req.method,
            details: {
              paymentIntentId: paymentIntent.id,
              bookingId,
            },
          })
        ).catch(() => {});
        throw new AppError("Unable to process payment webhook safely", 500);
      }

      const user = await findUserById(committedPayment.user_id);
      const email = user?.email;
      await sendBookingPaidEmail({
        to: email,
        bookingId: committedPayment.booking_id,
        amount: committedPayment.amount,
      });

      Promise.resolve(
        enqueueGuideStatsUpdate(committedPayment.guide_id, {
          idempotencyKey: `payment-succeeded:${paymentIntent.id}:guide:${committedPayment.guide_id}`,
          correlationId: req.requestId || null,
          source: "payment_webhook",
        })
      ).catch(() => {});

      Promise.resolve(
        enqueueAnalyticsEvent(
          {
            userId: committedPayment.user_id,
            eventType: "booking_completed",
            guideId: String(committedPayment.guide_id),
            metadata: {
              bookingId: committedPayment.booking_id,
              paymentIntentId: paymentIntent.id,
              amount: committedPayment.amount,
            },
          },
          {
            idempotencyKey: `booking-completed:${committedPayment.booking_id}`,
            correlationId: req.requestId || null,
          }
        )
      ).catch(() => {});

      if (email) {
        Promise.resolve(
          enqueueEmailNotification(
            {
              channel: "email",
              to: email,
              template: "booking-paid-confirmation",
              data: {
                bookingId: committedPayment.booking_id,
                amount: committedPayment.amount,
              },
              messageId: `booking-paid:${committedPayment.booking_id}`,
            },
            {
              correlationId: req.requestId || null,
            }
          )
        ).catch(() => {});
      }

      Promise.resolve(
        enqueueReconciliationRun({
          idempotencyKey: `webhook-success:${paymentIntent.id}`,
          lookbackHours: 6,
          trigger: "webhook_success",
          correlationId: req.requestId || null,
        })
      ).catch(() => {});
    } else if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;
      await updatePaymentStatusByIntent(paymentIntent.id, "failed", paymentIntent);

      Promise.resolve(
        enqueueReconciliationRun({
          idempotencyKey: `webhook-failed:${paymentIntent.id}`,
          lookbackHours: 12,
          trigger: "webhook_failed",
          correlationId: req.requestId || null,
        })
      ).catch(() => {});

      Promise.resolve(
        sendWarning({
          event: "payment_intent_failed",
          title: "Payment intent failed",
          message: paymentIntent.last_payment_error?.message || "Stripe payment intent failed",
          requestId: req.requestId || null,
          path: req.originalUrl,
          method: req.method,
          statusCode: 402,
          details: {
            paymentIntentId: paymentIntent.id,
            bookingId: paymentIntent.metadata?.bookingId || null,
            errorCode: paymentIntent.last_payment_error?.code || null,
          },
        })
      ).catch(() => {});
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error("Stripe webhook failed", { message: error.message });
    Promise.resolve(
      sendHighAlert({
        event: "webhook_processing_failed",
        title: "Stripe webhook processing failed",
        message: error.message,
        requestId: req.requestId || null,
        path: req.originalUrl,
        method: req.method,
        code: error.code || null,
      })
    ).catch(() => {});
    return next(error);
  }
}

module.exports = {
  createPaymentIntentHandler,
  stripeWebhookHandler,
};