const express = require("express");
const Joi = require("joi");
const {
	getDashboardMetricsHandler,
	getUsersHandler,
	updateUserRoleHandler,
	updateUserStatusHandler,
} = require("../controllers/adminController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { roleMiddleware } = require("../middleware/roleMiddleware");
const { validationMiddleware } = require("../middleware/validationMiddleware");

const router = express.Router();

const roleUpdateSchema = Joi.object({
	role: Joi.string().valid("user", "guide", "admin").required(),
});

const statusUpdateSchema = Joi.object({
	is_active: Joi.boolean().required(),
});

router.get("/metrics", authMiddleware, roleMiddleware("admin"), getDashboardMetricsHandler);
router.get("/users", authMiddleware, roleMiddleware("admin"), getUsersHandler);
router.patch(
	"/users/:id/role",
	authMiddleware,
	roleMiddleware("admin"),
	validationMiddleware(roleUpdateSchema),
	updateUserRoleHandler
);
router.patch(
	"/users/:id/status",
	authMiddleware,
	roleMiddleware("admin"),
	validationMiddleware(statusUpdateSchema),
	updateUserStatusHandler
);

module.exports = router;