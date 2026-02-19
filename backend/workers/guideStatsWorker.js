const { query } = require("../config/db");
const logger = require("../config/logger");
const {
  QUEUE_NAMES,
  createWorker,
  ensureQueueConnection,
  registerGracefulQueueShutdown,
} = require("../config/queue");

async function updateGuideStats(guideId) {
  const normalizedGuideId = Number(guideId);
  if (!Number.isFinite(normalizedGuideId) || normalizedGuideId <= 0) {
    throw new Error("Invalid guideId for guide stats update");
  }

  const aggregates = await query(
    `
      SELECT
        COUNT(*) AS totalBookings,
        MAX(b.updated_at) AS lastBooked,
        COALESCE(AVG(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.total_price END), 0) AS averageBookingValue,
        COALESCE(AVG(r.rating), 0) AS avgRating,
        COUNT(r.id) AS totalReviews
      FROM bookings b
      LEFT JOIN reviews r ON r.booking_id = b.id
      WHERE b.guide_id = ?
    `,
    [normalizedGuideId]
  );

  const row = aggregates[0] || {};

  await query(
    `
      INSERT INTO guide_performance_stats (
        guide_id,
        total_bookings,
        avg_rating,
        total_reviews,
        avg_booking_value,
        last_booked,
        last_updated
      )
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        total_bookings = VALUES(total_bookings),
        avg_rating = VALUES(avg_rating),
        total_reviews = VALUES(total_reviews),
        avg_booking_value = VALUES(avg_booking_value),
        last_booked = VALUES(last_booked),
        last_updated = CURRENT_TIMESTAMP
    `,
    [
      normalizedGuideId,
      Number(row.totalBookings || 0),
      Number(row.avgRating || 0),
      Number(row.totalReviews || 0),
      Number(row.averageBookingValue || 0),
      row.lastBooked || null,
    ]
  );

  return {
    guideId: normalizedGuideId,
    totalBookings: Number(row.totalBookings || 0),
  };
}

function buildGuideStatsWorker() {
  return createWorker(
    QUEUE_NAMES.GUIDE_PERFORMANCE,
    async (job) => {
      try {
        const result = await updateGuideStats(job.data.guideId);
        logger.info("guide_stats_job_processed", {
          event: "guide_stats_job_processed",
          queue: QUEUE_NAMES.GUIDE_PERFORMANCE,
          jobId: job.id,
          guideId: result.guideId,
          totalBookings: result.totalBookings,
        });
        return result;
      } catch (error) {
        logger.error("guide_stats_job_failed", {
          event: "guide_stats_job_failed",
          queue: QUEUE_NAMES.GUIDE_PERFORMANCE,
          jobId: job.id,
          attemptsMade: job.attemptsMade,
          message: error.message,
        });
        throw error;
      }
    },
    {
      concurrency: Number(process.env.GUIDE_STATS_WORKER_CONCURRENCY || 5),
      lockDuration: Number(process.env.GUIDE_STATS_WORKER_LOCK_MS || 45000),
    }
  );
}

async function startGuideStatsWorker() {
  await ensureQueueConnection();
  registerGracefulQueueShutdown();
  const worker = buildGuideStatsWorker();
  logger.info("guide_stats_worker_started", {
    event: "guide_stats_worker_started",
    queue: QUEUE_NAMES.GUIDE_PERFORMANCE,
  });
  return worker;
}

if (require.main === module) {
  startGuideStatsWorker().catch((error) => {
    logger.error("guide_stats_worker_boot_failed", {
      event: "guide_stats_worker_boot_failed",
      message: error.message,
    });
    process.exit(1);
  });
}

module.exports = {
  startGuideStatsWorker,
  buildGuideStatsWorker,
};
