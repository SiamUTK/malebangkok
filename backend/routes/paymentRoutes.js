const express = require("express");
const Joi = require("joi");
const { createPaymentIntentHandler, stripeWebhookHandler } = require("../controllers/paymentController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { validationMiddleware } = require("../middleware/validationMiddleware");
const { paymentLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

const createIntentSchema = Joi.object({
  bookingId: Joi.number().integer().positive().required(),
});

router.post("/intent", authMiddleware, paymentLimiter, validationMiddleware(createIntentSchema), createPaymentIntentHandler);
router.post("/webhook", stripeWebhookHandler);

module.exports = router;