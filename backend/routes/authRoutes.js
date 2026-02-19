const express = require("express");
const Joi = require("joi");
const { register, login, me } = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { validationMiddleware } = require("../middleware/validationMiddleware");

const router = express.Router();

const registerSchema = Joi.object({
  email: Joi.string().email().max(150).required(),
  password: Joi.string().min(8).max(72).required(),
  role: Joi.string().valid("user", "guide").default("user"),
});

const loginSchema = Joi.object({
  email: Joi.string().email().max(150).required(),
  password: Joi.string().required(),
});

router.post("/register", validationMiddleware(registerSchema), register);
router.post("/login", validationMiddleware(loginSchema), login);
router.get("/me", authMiddleware, me);

module.exports = router;
