const express = require("express");
const Joi = require("joi");
const {
  previewPricingHandler,
  createBookingHandler,
  getMyBookingsHandler,
  updateBookingStatusHandler,
} = require("../controllers/bookingController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { roleMiddleware } = require("../middleware/roleMiddleware");
const { bookingLimiter } = require("../middleware/rateLimiter");
const { validationMiddleware } = require("../middleware/validationMiddleware");

const router = express.Router();

const bookingSchema = Joi.object({
  guideId: Joi.number().integer().positive().required(),
  bookingDate: Joi.date().iso().required(),
  durationHours: Joi.number().positive().max(24).required(),
  notes: Joi.string().max(1500).allow("", null),
  premiumOptions: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().max(120).required(),
        price: Joi.number().min(0).required(),
      })
    )
    .default([]),
});

const previewPricingSchema = Joi.object({
  basePrice: Joi.number().positive().required(),
  bookingDate: Joi.date().iso().required(),
  durationHours: Joi.number().positive().max(24).required(),
  premiumOptions: Joi.array().items(
    Joi.object({
      name: Joi.string().max(120).required(),
      price: Joi.number().min(0).required(),
    })
  ),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid("confirmed", "completed", "cancelled").required(),
});

router.post("/pricing/preview", authMiddleware, validationMiddleware(previewPricingSchema), previewPricingHandler);
router.post("/", authMiddleware, bookingLimiter, validationMiddleware(bookingSchema), createBookingHandler);
router.get("/my", authMiddleware, getMyBookingsHandler);
router.patch(
  "/:id/status",
  authMiddleware,
  roleMiddleware("admin"),
  validationMiddleware(updateStatusSchema),
  updateBookingStatusHandler
);

module.exports = router;
