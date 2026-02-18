const { query } = require("../config/db");

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

module.exports = {
  getDashboardMetricsHandler,
};