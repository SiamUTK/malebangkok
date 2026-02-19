const express = require("express");
const Joi = require("joi");
const {
  createGuideHandler,
  getGuidesHandler,
  getGuideByIdHandler,
  getRecommendedGuidesHandler,
  updateGuideHandler,
  deleteGuideHandler,
} = require("../controllers/guideController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { roleMiddleware } = require("../middleware/roleMiddleware");
const { validationMiddleware } = require("../middleware/validationMiddleware");

const router = express.Router();

const createGuideSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
  name: Joi.string().min(2).max(120).required(),
  bio: Joi.string().min(20).max(3000).required(),
  specialties: Joi.string().max(255).allow("", null),
  basePrice: Joi.number().positive().required(),
  age: Joi.number().integer().min(18).max(70).allow(null),
  city: Joi.string().max(100).default("Bangkok"),
  verified: Joi.boolean().default(false),
});

const updateGuideSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  bio: Joi.string().min(20).max(3000).required(),
  basePrice: Joi.number().positive().required(),
  age: Joi.number().integer().min(18).max(70).allow(null),
  verified: Joi.boolean().default(false),
});

const matchingSchema = Joi.object({
  preferredAgeMin: Joi.number().min(18).max(70).default(18),
  preferredAgeMax: Joi.number().min(18).max(70).default(60),
  priceMin: Joi.number().min(0).default(0),
  priceMax: Joi.number().min(0).default(100000),
  verifiedOnly: Joi.boolean().default(false),
  minRating: Joi.number().min(0).max(5).default(0),
  requireAvailability: Joi.boolean().default(true),
});

router.get("/", getGuidesHandler);
router.get("/:id", getGuideByIdHandler);
router.post("/match", authMiddleware, validationMiddleware(matchingSchema), getRecommendedGuidesHandler);
router.post("/", authMiddleware, roleMiddleware("admin"), validationMiddleware(createGuideSchema), createGuideHandler);
router.put("/:id", authMiddleware, roleMiddleware("admin"), validationMiddleware(updateGuideSchema), updateGuideHandler);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteGuideHandler);

module.exports = router;
