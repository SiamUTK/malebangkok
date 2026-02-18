const express = require("express");
const { getDashboardMetricsHandler } = require("../controllers/adminController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { roleMiddleware } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/metrics", authMiddleware, roleMiddleware("admin"), getDashboardMetricsHandler);

module.exports = router;