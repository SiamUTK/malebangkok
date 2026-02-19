const { getGuideById } = require("../models/guideModel");
const {
  createBookingAtomic,
  getBookingsByUser,
  getBookingById,
  updateBookingStatus,
} = require("../models/bookingModel");
const { calculateDynamicPricing } = require("../services/pricingService");
const { AppError } = require("../middleware/errorMiddleware");
const { pool } = require("../config/db");
const logger = require("../config/logger");

const ALLOWED_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const MAX_CREATE_BOOKING_TX_ATTEMPTS = 2; // initial try + 1 retry
const RETRIABLE_DB_ERROR_CODES = new Set(["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"]);

function isRetriableDbError(error) {
  return RETRIABLE_DB_ERROR_CODES.has(error?.code);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function createBookingHandler(req, res, next) {
  try {
    const { guideId, bookingDate, durationHours, premiumOptions = [], notes } = req.body;

    const normalizedGuideId = Number(guideId);
    const normalizedDurationHours = Number(durationHours);

    const guide = await getGuideById(normalizedGuideId);

    if (!guide || !guide.is_active) {
      return res.status(404).json({ message: "Guide not found or inactive" });
    }

    if (!guide.is_available) {
      return res.status(409).json({ message: "Guide is currently unavailable" });
    }

    const pricing = calculateDynamicPricing({
      basePrice: guide.base_price,
      durationHours: normalizedDurationHours,
      bookingDateTime: bookingDate,
      premiumOptions,
    });

    let bookingId = null;

    // Transaction boundary: acquire one connection and keep all lock/read/write operations on it.
    for (let attempt = 1; attempt <= MAX_CREATE_BOOKING_TX_ATTEMPTS; attempt += 1) {
      let connection;
      try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        bookingId = await createBookingAtomic(
          {
            userId: req.user.id,
            guideId: normalizedGuideId,
            bookingDate,
            durationHours: normalizedDurationHours,
            totalPrice: pricing.totalAmount,
            baseAmount: pricing.baseAmount,
            peakAmount: pricing.peakAmount,
            weekendAmount: pricing.weekendAmount,
            premiumAmount: pricing.premiumAmount,
            premiumOptions,
            notes: notes ? String(notes).trim() : null,
          },
          connection
        );

        await connection.commit();
        break;
      } catch (error) {
        if (connection) {
          try {
            await connection.rollback();
          } catch (rollbackError) {
            logger.error("create_booking_rollback_failed", {
              event: "create_booking_rollback_failed",
              guideId: normalizedGuideId,
              userId: req.user?.id,
              message: rollbackError.message,
            });
          }
        }

        if (error?.code === "BOOKING_CONFLICT") {
          throw new AppError("Selected time slot is not available", 409);
        }

        if (isRetriableDbError(error) && attempt < MAX_CREATE_BOOKING_TX_ATTEMPTS) {
          logger.warn("create_booking_retry", {
            event: "create_booking_retry",
            guideId: normalizedGuideId,
            userId: req.user?.id,
            reason: error.code,
            attempt,
          });
          await sleep(attempt * 100);
          continue;
        }

        throw error;
      } finally {
        if (connection) {
          connection.release();
        }
      }
    }

    if (!bookingId) {
      throw new AppError("Unable to create booking safely", 500);
    }

    logger.info("booking_created_atomic", {
      event: "booking_created_atomic",
      bookingId,
      guideId: normalizedGuideId,
      userId: req.user?.id,
      status: "pending",
    });

    return res.status(201).json({
      message: "Booking created in pending status",
      booking: {
        id: bookingId,
        userId: req.user.id,
        guideId: normalizedGuideId,
        bookingDate,
        durationHours: normalizedDurationHours,
        totalPrice: pricing.totalAmount,
        status: "pending",
      },
      pricing,
      nextAction: "Create payment intent at POST /api/payments/intent",
    });
  } catch (error) {
    return next(error);
  }
}

async function previewPricingHandler(req, res, next) {
  try {
    const { basePrice, bookingDate, durationHours, premiumOptions = [] } = req.body;
    const pricing = calculateDynamicPricing({
      basePrice,
      bookingDateTime: bookingDate,
      durationHours,
      premiumOptions,
    });

    return res.status(200).json({ pricing });
  } catch (error) {
    return next(error);
  }
}

async function getMyBookingsHandler(req, res, next) {
  try {
    const bookings = await getBookingsByUser(req.user.id);
    return res.status(200).json({ bookings });
  } catch (error) {
    return next(error);
  }
}

async function updateBookingStatusHandler(req, res, next) {
  try {
    const bookingId = Number(req.params.id);
    const { status } = req.body;

    if (Number.isNaN(bookingId)) {
      return res.status(400).json({ message: "Booking id must be a number" });
    }

    const booking = await getBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const allowedTargets = ALLOWED_TRANSITIONS[booking.status] || [];
    if (!allowedTargets.includes(status)) {
      throw new AppError(
        `Invalid status transition from ${booking.status} to ${status}`,
        400,
        { from: booking.status, to: status, allowed: allowedTargets }
      );
    }

    const updated = await updateBookingStatus(bookingId, status);

    if (!updated) {
      return res.status(404).json({ message: "Booking not found" });
    }

    return res.status(200).json({ message: "Booking status updated" });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createBookingHandler,
  previewPricingHandler,
  getMyBookingsHandler,
  updateBookingStatusHandler,
};
