const nodemailer = require("nodemailer");
const { stripe, stripeWebhookSecret } = require("../config/stripe");
const logger = require("../config/logger");
const { AppError } = require("../middleware/errorMiddleware");
const { getBookingById, setBookingPaymentIntent, markBookingAsConfirmed } = require("../models/bookingModel");
const {
  createPaymentRecord,
  updatePaymentStatusByIntent,
  getPaymentByIntentId,
} = require("../models/paymentModel");
const { calculateCommission } = require("../services/commissionService");
const { upsertCommissionByBooking } = require("../models/commissionModel");
const { findUserById } = require("../models/userModel");

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

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(booking.total_price) * 100),
      currency: "thb",
      metadata: {
        bookingId: String(booking.id),
        userId: String(booking.user_id),
        guideId: String(booking.guide_id),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    await setBookingPaymentIntent(booking.id, paymentIntent.id);
    await createPaymentRecord({
      bookingId: booking.id,
      userId: booking.user_id,
      guideId: booking.guide_id,
      amount: booking.total_price,
      currency: "thb",
      stripePaymentIntentId: paymentIntent.id,
      status: paymentIntent.status || "requires_action",
    });

    return res.status(201).json({
      message: "Payment intent created",
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
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

      const payment = await getPaymentByIntentId(paymentIntent.id);
      if (payment) {
        await updatePaymentStatusByIntent(paymentIntent.id, "succeeded", paymentIntent);
        await markBookingAsConfirmed(bookingId);

        const commission = calculateCommission({ bookingTotal: payment.amount });
        await upsertCommissionByBooking({
          bookingId: payment.booking_id,
          guideId: payment.guide_id,
          grossAmount: payment.amount,
          platformRate: commission.platformRate,
          platformAmount: commission.platformAmount,
          guideAmount: commission.guideAmount,
          status: "settled",
        });

        const user = await findUserById(payment.user_id);
        const email = user?.email;
        await sendBookingPaidEmail({
          to: email,
          bookingId: payment.booking_id,
          amount: payment.amount,
        });
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;
      await updatePaymentStatusByIntent(paymentIntent.id, "failed", paymentIntent);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error("Stripe webhook failed", { message: error.message });
    return next(error);
  }
}

module.exports = {
  createPaymentIntentHandler,
  stripeWebhookHandler,
};