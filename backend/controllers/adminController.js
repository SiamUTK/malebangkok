const { query } = require("../config/db");
const {
  getAllUsersForAdmin,
  findUserById,
  updateUserRoleById,
  updateUserStatusById,
} = require("../models/userModel");
const { AppError } = require("../middleware/errorMiddleware");

async function getDashboardMetricsHandler(req, res, next) {
  try {
    const [users] = await query("SELECT COUNT(*) AS total_users FROM users");
    const [guides] = await query("SELECT COUNT(*) AS total_guides FROM guides");
    const [bookings] = await query("SELECT COUNT(*) AS total_bookings FROM bookings");
    const [gmv] = await query(
      "SELECT COALESCE(SUM(amount), 0) AS total_gmv FROM payments WHERE status IN ('succeeded','paid')"
    );
    const [platformRevenue] = await query(
      "SELECT COALESCE(SUM(platform_amount), 0) AS total_platform_revenue FROM commissions WHERE status IN ('pending','settled')"
    );
    const [guidePayout] = await query(
      "SELECT COALESCE(SUM(guide_amount), 0) AS total_guide_payout FROM commissions WHERE status IN ('pending','settled')"
    );

    return res.status(200).json({
      metrics: {
        totalUsers: users.total_users,
        totalGuides: guides.total_guides,
        totalBookings: bookings.total_bookings,
        totalGMV: gmv.total_gmv,
        totalPlatformRevenue: platformRevenue.total_platform_revenue,
        totalGuidePayout: guidePayout.total_guide_payout,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getUsersHandler(req, res, next) {
  try {
    const users = await getAllUsersForAdmin();
    return res.status(200).json({ users });
  } catch (error) {
    return next(error);
  }
}

async function updateUserRoleHandler(req, res, next) {
  try {
    const targetUserId = Number(req.params.id);
    const { role } = req.body;

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      throw new AppError("Invalid user id", 400);
    }

    const allowedRoles = ["user", "guide", "admin"];
    if (!allowedRoles.includes(role)) {
      throw new AppError("Invalid role", 400);
    }

    const targetUser = await findUserById(targetUserId);
    if (!targetUser) {
      throw new AppError("User not found", 404);
    }

    if (targetUserId === req.user.id && role !== "admin") {
      throw new AppError("Admin cannot demote self", 400);
    }

    const updated = await updateUserRoleById(targetUserId, role);
    if (!updated) {
      throw new AppError("Failed to update role", 500);
    }

    const user = await findUserById(targetUserId);
    return res.status(200).json({ message: "User role updated", user });
  } catch (error) {
    return next(error);
  }
}

async function updateUserStatusHandler(req, res, next) {
  try {
    const targetUserId = Number(req.params.id);
    const { is_active: isActive } = req.body;

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      throw new AppError("Invalid user id", 400);
    }

    if (typeof isActive !== "boolean") {
      throw new AppError("is_active must be a boolean", 400);
    }

    const targetUser = await findUserById(targetUserId);
    if (!targetUser) {
      throw new AppError("User not found", 404);
    }

    if (targetUserId === req.user.id && !isActive) {
      throw new AppError("Admin cannot deactivate self", 400);
    }

    const updated = await updateUserStatusById(targetUserId, isActive);
    if (!updated) {
      throw new AppError("Failed to update user status", 500);
    }

    const user = await findUserById(targetUserId);
    return res.status(200).json({ message: "User status updated", user });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getDashboardMetricsHandler,
  getUsersHandler,
  updateUserRoleHandler,
  updateUserStatusHandler,
};