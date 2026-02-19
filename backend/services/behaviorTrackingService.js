// File: backend/services/behaviorTrackingService.js
// Purpose: Track user interactions for personalization learning
// 
// Features:
// - Non-blocking (async, fire-and-forget)
// - Handles anonymous users safely
// - Defensive coding (no crashes on bad input)
// - Batch-friendly structure
// 
// Usage:
//   const behaviorTracking = require('./behaviorTrackingService');
//   behaviorTracking.trackUserEvent(user_id, 'guide_clicked', guide_id, metadata);

const pool = require('../config/db');

const VALID_EVENT_TYPES = [
  'guide_viewed',
  'guide_clicked',
  'booking_started',
  'booking_completed',
  'matching_used',
  'search_performed'
];

/**
 * Log user behavior event to database
 * 
 * IMPORTANT: This function NEVER blocks the request
 * Errors are logged but not thrown
 * 
 * @param {number|null} userId - User ID (null = anonymous user)
 * @param {string} eventType - Type of event (must be in VALID_EVENT_TYPES)
 * @param {string|null} guideId - Guide ID (if applicable to event)
 * @param {object} metadata - Event metadata (JSON)
 * @param {function} callback - Optional callback(err) for testing
 */
const trackUserEvent = (userId, eventType, guideId = null, metadata = {}, callback = null) => {
  // Validation & safety
  if (!userId) {
    // Anonymous users - don't track (no personalization)
    if (callback) callback(null);
    return;
  }

  // Sanity check: user_id must be number
  const numericUserId = Number(userId);
  if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
    console.warn('[BehaviorTracking] Invalid user_id:', userId);
    if (callback) callback(null);
    return;
  }

  // Validate event type
  if (!eventType || typeof eventType !== 'string') {
    console.warn('[BehaviorTracking] Invalid event_type:', eventType);
    if (callback) callback(null);
    return;
  }

  const normalizedEventType = eventType.trim().toLowerCase();
  if (!VALID_EVENT_TYPES.includes(normalizedEventType)) {
    console.warn('[BehaviorTracking] Unknown event_type:', eventType);
    if (callback) callback(null);
    return;
  }

  // Sanitize guide_id
  let sanitizedGuideId = null;
  if (guideId) {
    sanitizedGuideId = String(guideId).trim() || null;
  }

  // Sanitize metadata (ensure it's an object)
  let sanitizedMetadata = {};
  if (typeof metadata === 'object' && metadata !== null) {
    sanitizedMetadata = metadata;
  }

  // Async insert (fire and forget)
  insertBehaviorEvent(numericUserId, normalizedEventType, sanitizedGuideId, sanitizedMetadata)
    .then(() => {
      if (callback) callback(null);
    })
    .catch((error) => {
      // Log error but don't throw
      console.error('[BehaviorTracking] Database error:', error.message);
      if (callback) callback(error);
    });
};

/**
 * Internal: Insert behavior event into database
 * @private
 * @returns {Promise<void>}
 */
async function insertBehaviorEvent(userId, eventType, guideId, metadata) {
  const connection = await pool.getConnection();
  try {
    const sql = `
      INSERT INTO user_behavior_events (user_id, event_type, guide_id, metadata, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `;
    
    const metadataJson = JSON.stringify(metadata);
    await connection.execute(sql, [userId, eventType, guideId, metadataJson]);
  } finally {
    connection.release();
  }
}

/**
 * Update user preference profile based on latest behavior
 * 
 * Call this periodically (daily batch or on-demand)
 * EXPENSIVE: Reads many rows, computes statistics
 * 
 * @param {number} userId - User to update
 * @returns {Promise<object>} Updated preference profile
 */
const updateUserPreferences = async (userId) => {
  if (!userId || !Number.isFinite(Number(userId))) {
    throw new Error('Invalid user_id');
  }

  const connection = await pool.getConnection();
  try {
    // Get recent behavior events for this user
    const [events] = await connection.execute(
      `
      SELECT event_type, guide_id, metadata, created_at
      FROM user_behavior_events
      WHERE user_id = ? AND event_type IN ('guide_clicked', 'booking_completed')
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [userId]
    );

    if (!events || events.length === 0) {
      // No events - don't update preferences, leave as default
      return { updated: false, reason: 'no_events' };
    }

    // Infer preferences from events
    const priceValues = [];
    const ageValues = [];
    let verifiedCount = 0;
    const cityValues = [];
    const eventDates = [];

    for (const event of events) {
      if (!event.metadata) continue;

      const metadata = typeof event.metadata === 'string' 
        ? JSON.parse(event.metadata) 
        : event.metadata;

      // Extract price
      if (Number.isFinite(metadata.guide_price)) {
        priceValues.push(metadata.guide_price);
      }

      // Extract age
      if (Number.isFinite(metadata.guide_age)) {
        ageValues.push(metadata.guide_age);
      }

      // Extract verified status
      if (metadata.guide_verified === true || metadata.guide_verified === 1) {
        verifiedCount += 1;
      }

      // Extract city
      if (metadata.guide_city) {
        cityValues.push(String(metadata.guide_city).trim().toLowerCase());
      }

      // Track event date for activity span
      eventDates.push(new Date(event.created_at));
    }

    // Infer preferred price range
    let preferredPriceMin = 1500;
    let preferredPriceMax = 8000;
    if (priceValues.length >= 3) {
      priceValues.sort((a, b) => a - b);
      const p25 = priceValues[Math.floor(priceValues.length * 0.25)];
      const p75 = priceValues[Math.floor(priceValues.length * 0.75)];
      preferredPriceMin = Math.max(1000, p25 - 500);
      preferredPriceMax = Math.min(15000, p75 + 500);
    }

    // Infer preferred age range
    let preferredAgeMin = 24;
    let preferredAgeMax = 40;
    if (ageValues.length >= 3) {
      ageValues.sort((a, b) => a - b);
      const p25 = ageValues[Math.floor(ageValues.length * 0.25)];
      const p75 = ageValues[Math.floor(ageValues.length * 0.75)];
      preferredAgeMin = Math.max(18, p25 - 3);
      preferredAgeMax = Math.min(70, p75 + 3);
    }

    // Infer verified preference (if > 70% of clicked guides are verified)
    const prefersVerified = verifiedCount >= (events.length * 0.7) ? 1 : 0;

    // Infer city preference (most common city)
    let preferredCity = '';
    if (cityValues.length > 0) {
      const cityFrequency = {};
      for (const city of cityValues) {
        cityFrequency[city] = (cityFrequency[city] || 0) + 1;
      }
      const topCity = Object.entries(cityFrequency)
        .sort((a, b) => b[1] - a[1])[0];
      if (topCity && topCity[1] >= 2) {
        preferredCity = topCity[0];
      }
    }

    // Calculate confidence score (0-1)
    // Based on: number of events and activity span
    const activityDays = eventDates.length > 1
      ? Math.ceil((eventDates[0] - eventDates[eventDates.length - 1]) / (1000 * 60 * 60 * 24))
      : 0;
    
    let confidenceScore = 0;
    if (events.length >= 20 && activityDays >= 10) {
      confidenceScore = 0.9;
    } else if (events.length >= 10 && activityDays >= 5) {
      confidenceScore = 0.7;
    } else if (events.length >= 5 && activityDays >= 2) {
      confidenceScore = 0.5;
    } else if (events.length >= 3) {
      confidenceScore = 0.3;
    }

    // Insert or update preference profile
    const sql = `
      INSERT INTO user_preference_profiles 
        (user_id, preferred_price_min, preferred_price_max, 
         preferred_age_min, preferred_age_max, prefers_verified, 
         preferred_city, confidence_score, behavior_events_count, 
         days_with_activity, last_recalculated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        preferred_price_min = ?,
        preferred_price_max = ?,
        preferred_age_min = ?,
        preferred_age_max = ?,
        prefers_verified = ?,
        preferred_city = ?,
        confidence_score = ?,
        behavior_events_count = ?,
        days_with_activity = ?,
        last_recalculated = NOW()
    `;

    const values = [
      userId,
      preferredPriceMin,
      preferredPriceMax,
      preferredAgeMin,
      preferredAgeMax,
      prefersVerified,
      preferredCity,
      confidenceScore,
      events.length,
      activityDays,
      // Duplicate key update values
      preferredPriceMin,
      preferredPriceMax,
      preferredAgeMin,
      preferredAgeMax,
      prefersVerified,
      preferredCity,
      confidenceScore,
      events.length,
      activityDays
    ];

    await connection.execute(sql, values);

    return {
      updated: true,
      profile: {
        user_id: userId,
        preferred_price_min: preferredPriceMin,
        preferred_price_max: preferredPriceMax,
        preferred_age_min: preferredAgeMin,
        preferred_age_max: preferredAgeMax,
        prefers_verified: prefersVerified,
        preferred_city: preferredCity,
        confidence_score: confidenceScore
      }
    };
  } finally {
    connection.release();
  }
};

/**
 * Update guide performance statistics
 * 
 * Call this daily (batch job)
 * Aggregates behavior events into performance metrics
 * 
 * @returns {Promise<{updated: number}>} Number of guides updated
 */
const updateGuidePerformanceStats = async () => {
  const connection = await pool.getConnection();
  try {
    // Step 1: Get all guides with recent activity
    const [guides] = await connection.execute(
      `
      SELECT DISTINCT guide_id FROM user_behavior_events 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
      `
    );

    let updated = 0;

    // Step 2: For each guide, calculate stats
    for (const { guide_id } of guides) {
      if (!guide_id) continue;

      // Count views, clicks, bookings
      const [stats] = await connection.execute(
        `
        SELECT
          SUM(CASE WHEN event_type = 'guide_viewed' THEN 1 ELSE 0 END) as total_views,
          SUM(CASE WHEN event_type = 'guide_clicked' THEN 1 ELSE 0 END) as total_clicks,
          SUM(CASE WHEN event_type = 'booking_completed' THEN 1 ELSE 0 END) as total_bookings,
          SUM(CASE WHEN event_type = 'guide_viewed' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as views_last_7,
          SUM(CASE WHEN event_type = 'guide_clicked' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as clicks_last_7,
          SUM(CASE WHEN event_type = 'booking_completed' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as bookings_last_7,
          MAX(created_at) as last_activity
        FROM user_behavior_events
        WHERE guide_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        `,
        [guide_id]
      );

      const stat = stats[0] || {};
      const totalViews = Number(stat.total_views) || 0;
      const totalClicks = Number(stat.total_clicks) || 0;
      const totalBookings = Number(stat.total_bookings) || 0;
      
      // Calculate conversion rates
      const conversionRate = totalViews > 0 
        ? Number(((totalClicks / totalViews) * 100).toFixed(2)) 
        : 0;
      
      const ctrRate = totalClicks > 0
        ? Number(((totalBookings / totalClicks) * 100).toFixed(2))
        : 0;

      // Calculate trending score (boost recent activity)
      const viewsLastWeek = Number(stat.views_last_7) || 0;
      const avgViewsPerDay = totalViews / 90;
      const trendingScore = viewsLastWeek > avgViewsPerDay * 2 ? 1.15 : (viewsLastWeek < avgViewsPerDay * 0.5 ? 0.85 : 1.0);

      // Insert or update stats
      await connection.execute(
        `
        INSERT INTO guide_performance_stats 
          (guide_id, total_views, total_clicks, total_bookings, 
           conversion_rate, click_through_rate, views_last_7_days, 
           clicks_last_7_days, bookings_last_7_days, trending_score, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          total_views = ?,
          total_clicks = ?,
          total_bookings = ?,
          conversion_rate = ?,
          click_through_rate = ?,
          views_last_7_days = ?,
          clicks_last_7_days = ?,
          bookings_last_7_days = ?,
          trending_score = ?,
          last_updated = NOW()
        `,
        [
          guide_id, totalViews, totalClicks, totalBookings,
          conversionRate, ctrRate,
          viewsLastWeek, Number(stat.clicks_last_7), Number(stat.bookings_last_7),
          trendingScore,
          // Duplicate key updates
          totalViews, totalClicks, totalBookings,
          conversionRate, ctrRate,
          viewsLastWeek, Number(stat.clicks_last_7), Number(stat.bookings_last_7),
          trendingScore
        ]
      );

      updated += 1;
    }

    console.log(`[BehaviorTracking] Updated guide performance for ${updated} guides`);
    return { updated };
  } finally {
    connection.release();
  }
};

/**
 * Get user preference profile
 * 
 * Returns null if user has no profile (brand new user)
 * 
 * @param {number} userId 
 * @returns {Promise<object|null>}
 */
const getUserPreferences = async (userId) => {
  if (!userId || !Number.isFinite(Number(userId))) {
    return null;
  }

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM user_preference_profiles WHERE user_id = ?',
      [userId]
    );
    return rows.length > 0 ? rows[0] : null;
  } finally {
    connection.release();
  }
};

/**
 * Get guide performance stats
 * 
 * @param {string} guideId 
 * @returns {Promise<object|null>}
 */
const getGuideStats = async (guideId) => {
  if (!guideId) {
    return null;
  }

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM guide_performance_stats WHERE guide_id = ?',
      [guideId]
    );
    return rows.length > 0 ? rows[0] : null;
  } finally {
    connection.release();
  }
};

/**
 * Batch delete user data (GDPR/Privacy)
 * 
 * Call when user requests data deletion
 * Archives behavior before deletion
 * 
 * @param {number} userId 
 * @returns {Promise<object>}
 */
const deleteUserBehaviorData = async (userId) => {
  if (!userId || !Number.isFinite(Number(userId))) {
    throw new Error('Invalid user_id');
  }

  const connection = await pool.getConnection();
  try {
    // Step 1: Archive to archive table
    await connection.execute(
      `
      INSERT INTO user_behavior_archive (id, user_id, event_type, guide_id, booking_id, metadata, created_at)
      SELECT id, user_id, event_type, guide_id, booking_id, metadata, created_at
      FROM user_behavior_events
      WHERE user_id = ?
      `,
      [userId]
    );

    // Step 2: Delete from active table
    const [result] = await connection.execute(
      'DELETE FROM user_behavior_events WHERE user_id = ?',
      [userId]
    );

    // Step 3: Delete preference profile
    await connection.execute(
      'DELETE FROM user_preference_profiles WHERE user_id = ?',
      [userId]
    );

    console.log(`[BehaviorTracking] Deleted behavior data for user ${userId}`);
    return {
      deleted: true,
      events_archived: result.affectedRows
    };
  } finally {
    connection.release();
  }
};

module.exports = {
  trackUserEvent,
  updateUserPreferences,
  updateGuidePerformanceStats,
  getUserPreferences,
  getGuideStats,
  deleteUserBehaviorData,
  VALID_EVENT_TYPES
};
