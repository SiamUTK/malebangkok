const { getGuideById } = require("../models/guideModel");
const {
  createBooking,
  getBookingsByUser,
  getBookingById,
  hasGuideBookingConflict,
  updateBookingStatus,
} = require("../models/bookingModel");
const { calculateDynamicPricing } = require("../services/pricingService");
const { AppError } = require("../middleware/errorMiddleware");

const ALLOWED_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

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

    const hasConflict = await hasGuideBookingConflict({
      guideId: normalizedGuideId,
      bookingDate,
      durationHours: normalizedDurationHours,
    });

    if (hasConflict) {
      throw new AppError("Selected time slot is not available", 409);
    }

    const pricing = calculateDynamicPricing({
      basePrice: guide.base_price,
      durationHours: normalizedDurationHours,
      bookingDateTime: bookingDate,
      premiumOptions,
    });

    const bookingId = await createBooking({
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
