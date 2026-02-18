const express = require("express");
const Joi = require("joi");
const { register, login, me } = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { validationMiddleware } = require("../middleware/validationMiddleware");
const { loginLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

const registerSchema = Joi.object({
	fullName: Joi.string().min(2).max(120).required(),
	email: Joi.string().email().required(),
	password: Joi.string().min(8).max(72).required(),
	phone: Joi.string().max(25).allow(null, ""),
	role: Joi.string().valid("client", "guide").default("client"),
});

const loginSchema = Joi.object({
	email: Joi.string().email().required(),
	password: Joi.string().required(),
});

router.post("/register", validationMiddleware(registerSchema), register);
router.post("/login", loginLimiter, validationMiddleware(loginSchema), login);
router.get("/me", authMiddleware, me);

module.exports = router;
