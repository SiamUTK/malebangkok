// File: backend/services/preferenceEngine.js
// Purpose: Preference inference and learning
// 
// Responsibilities:
// - Infer user preferences from behavior
// - Apply recency bias (recent behavior matters more)
// - Signal decay over time (old data less relevant)
// - Confidence scoring
// - Safe defaults for cold-start users

const pool = require('../config/db');

// Constants for preference inference
const PREFERENCES_CONFIG = {
  // Minimum events to start personalizing
  minEventsForPersonalization: 3,
  minDaysForPersonalization: 1,
  
  // Data retention
  maxEventAgeForInference: 90, // days
  
  // Recency weighting
  recentDayWeight: 2.0,     // Events from last 7 days weighted 2x
  moderateDayWeight: 1.0,   // Events 7-30 days weighted 1x
  oldDayWeight: 0.5,        // Events 30+ days weighted 0.5x
  
  // Confidence thresholds
  confidenceHighThreshold: 0.7,
  confidenceMediumThreshold: 0.3,
  
  // Default preferences (for cold-start users)
  defaults: {
    priceMin: 1500,
    priceMax: 8000,
    ageMin: 24,
    ageMax: 40,
    prefersVerified: false,
    preferredCity: ''
  }
};

/**
 * Infer user preferences from their behavior history
 * 
 * Applies recency bias - recent events weighted more heavily
 * Uses quantile-based ranges (25th-75th percentile)
 * 
 * @param {number} userId - User ID
 * @param {object} options - Optional overrides
 * @returns {Promise<object>} Preference profile
 */
const inferUserPreferences = async (userId, options = {}) => {
  if (!userId || !Number.isFinite(Number(userId))) {
    return getDefaultPreferences();
  }

  const connection = await pool.getConnection();
  try {
    // Get recent behavior events
    const [events] = await connection.execute(
      `
      SELECT 
        event_type,
        guide_id,
        metadata,
        created_at,
        DATEDIFF(NOW(), created_at) as days_ago
      FROM user_behavior_events
      WHERE user_id = ? 
        AND event_type IN ('guide_clicked', 'booking_completed')
        AND created_at > DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY created_at DESC
      LIMIT 100
      `,
      [userId, PREFERENCES_CONFIG.maxEventAgeForInference]
    );

    if (!events || events.length === 0) {
      return getDefaultPreferences();
    }

    // Extract and weight data points
    const priceScores = [];
    const ageScores = [];
    const cityScores = [];
    let verifiedCount = 0;
    let totalWeight = 0;

    for (const event of events) {
      try {
        // Parse metadata
        const metadata = typeof event.metadata === 'string'
          ? JSON.parse(event.metadata)
          : event.metadata;

        if (!metadata) continue;

        // Calculate recency weight
        const weight = calculateRecencyWeight(event.days_ago);
        totalWeight += weight;

        // Extract price with weight
        if (Number.isFinite(metadata.guide_price)) {
          priceScores.push({
            price: metadata.guide_price,
            weight
          });
        }

        // Extract age with weight
        if (Number.isFinite(metadata.guide_age)) {
          ageScores.push({
            age: metadata.guide_age,
            weight
          });
        }

        // Extract city with weight
        if (metadata.guide_city) {
          cityScores.push({
            city: String(metadata.guide_city).trim().toLowerCase(),
            weight
          });
        }

        // Track verified preference
        if (metadata.guide_verified === true || metadata.guide_verified === 1) {
          verifiedCount += weight;
        }
      } catch (e) {
        console.warn('[PreferenceEngine] Failed to parse event metadata:', e.message);
        continue;
      }
    }

    // Check if we have enough data
    const eventCount = events.length;
    const activitySpan = events.length > 1
      ? events[0].days_ago - events[events.length - 1].days_ago
      : 0;

    if (eventCount < PREFERENCES_CONFIG.minEventsForPersonalization ||
        activitySpan < PREFERENCES_CONFIG.minDaysForPersonalization) {
      return getDefaultPreferences();
    }

    // Infer price preference (weighted quantiles)
    const { min: priceMin, max: priceMax } = inferWeightedRange(
      priceScores,
      PREFERENCES_CONFIG.defaults.priceMin,
      PREFERENCES_CONFIG.defaults.priceMax
    );

    // Infer age preference (weighted quantiles)
    const { min: ageMin, max: ageMax } = inferWeightedRange(
      ageScores,
      PREFERENCES_CONFIG.defaults.ageMin,
      PREFERENCES_CONFIG.defaults.ageMax
    );

    // Infer verified preference (if > 70% verified)
    const prefersVerified = (verifiedCount / totalWeight) > 0.7;

    // Infer city preference (most common city by weight)
    const preferredCity = inferCityPreference(cityScores);

    // Calculate confidence score
    const confidenceScore = calculateConfidence(eventCount, activitySpan);

    return {
      user_id: userId,
      preferred_price_min: priceMin,
      preferred_price_max: priceMax,
      preferred_age_min: ageMin,
      preferred_age_max: ageMax,
      prefers_verified: prefersVerified,
      preferred_city: preferredCity,
      confidence_score: confidenceScore,
      // Meta information
      events_analyzed: eventCount,
      activity_span_days: activitySpan,
      inference_timestamp: new Date()
    };
  } finally {
    connection.release();
  }
};

/**
 * Calculate recency weight for a data point
 * 
 * Recent events (0-7 days) = higher weight
 * Medium events (7-30 days) = medium weight
 * Old events (30+ days) = lower weight
 * 
 * @param {number} daysAgo - How many days ago event occurred
 * @returns {number} Weight (0-2)
 */
function calculateRecencyWeight(daysAgo) {
  if (!Number.isFinite(daysAgo) || daysAgo < 0) {
    return PREFERENCES_CONFIG.moderateDayWeight;
  }

  if (daysAgo <= 7) {
    return PREFERENCES_CONFIG.recentDayWeight;
  }

  if (daysAgo <= 30) {
    return PREFERENCES_CONFIG.moderateDayWeight;
  }

  return PREFERENCES_CONFIG.oldDayWeight;
}

/**
 * Calculate weighted range (25th-75th percentile)
 * 
 * @param {array} scores - Array of {value, weight} objects
 * @param {number} defaultMin - Fallback minimum
 * @param {number} defaultMax - Fallback maximum
 * @returns {object} {min, max}
 */
function inferWeightedRange(scores, defaultMin, defaultMax) {
  if (!scores || scores.length === 0) {
    return { min: defaultMin, max: defaultMax };
  }

  try {
    // Sort by value
    const sorted = scores.sort((a, b) => a.price ? a.price - b.price : a.age - b.age);

    // Calculate weighted quantiles
    const totalWeight = sorted.reduce((sum, s) => sum + s.weight, 0);
    let cumulativeWeight = 0;
    let q25Value = null;
    let q75Value = null;

    for (const score of sorted) {
      cumulativeWeight += score.weight;
      const percentile = cumulativeWeight / totalWeight;

      if (percentile >= 0.25 && q25Value === null) {
        q25Value = score.price !== undefined ? score.price : score.age;
      }

      if (percentile >= 0.75) {
        q75Value = score.price !== undefined ? score.price : score.age;
        break;
      }
    }

    // Fallback to last value if q75 not found
    if (q75Value === null) {
      const last = sorted[sorted.length - 1];
      q75Value = last.price !== undefined ? last.price : last.age;
    }

    // Add safety margins
    let min = Math.max(defaultMin, q25Value - (defaultMax - defaultMin) * 0.2);
    let max = Math.min(defaultMax, q75Value + (defaultMax - defaultMin) * 0.2);

    // Ensure min < max
    if (min > max) {
      [min, max] = [max, min];
    }

    return { min: Math.round(min), max: Math.round(max) };
  } catch (e) {
    console.warn('[PreferenceEngine] Error inferring range:', e.message);
    return { min: defaultMin, max: defaultMax };
  }
}

/**
 * Infer city preference (most common city by weight)
 * 
 * @param {array} cityScores - Array of {city, weight} objects
 * @returns {string} City name or empty string
 */
function inferCityPreference(cityScores) {
  if (!cityScores || cityScores.length === 0) {
    return PREFERENCES_CONFIG.defaults.preferredCity;
  }

  try {
    // Aggregate by city (sum weights)
    const cityWeights = {};
    for (const score of cityScores) {
      if (score.city) {
        cityWeights[score.city] = (cityWeights[score.city] || 0) + score.weight;
      }
    }

    // Find city with highest weight
    let topCity = '';
    let topWeight = 0;
    for (const [city, weight] of Object.entries(cityWeights)) {
      if (weight > topWeight) {
        topCity = city;
        topWeight = weight;
      }
    }

    // Only return if city appears in at least 2 events
    return topWeight >= 2 ? topCity : PREFERENCES_CONFIG.defaults.preferredCity;
  } catch (e) {
    console.warn('[PreferenceEngine] Error inferring city:', e.message);
    return PREFERENCES_CONFIG.defaults.preferredCity;
  }
}

/**
 * Calculate confidence score based on data quality
 * 
 * @param {number} eventCount - Total events
 * @param {number} activitySpan - Days between first and last event
 * @returns {number} Confidence (0-1)
 */
function calculateConfidence(eventCount, activitySpan) {
  // Start at 0
  let score = 0;

  // Event count contribution (0-0.6)
  if (eventCount >= 30) {
    score += 0.6;
  } else if (eventCount >= 15) {
    score += 0.5;
  } else if (eventCount >= 8) {
    score += 0.3;
  } else if (eventCount >= 4) {
    score += 0.2;
  }

  // Activity span contribution (0-0.4)
  if (activitySpan >= 20) {
    score += 0.4;
  } else if (activitySpan >= 10) {
    score += 0.3;
  } else if (activitySpan >= 5) {
    score += 0.2;
  } else if (activitySpan >= 1) {
    score += 0.1;
  }

  return Math.min(score, 1.0); // Cap at 1.0
}

/**
 * Get default preferences (for cold-start users)
 * 
 * @returns {object}
 */
function getDefaultPreferences() {
  return {
    user_id: null,
    preferred_price_min: PREFERENCES_CONFIG.defaults.priceMin,
    preferred_price_max: PREFERENCES_CONFIG.defaults.priceMax,
    preferred_age_min: PREFERENCES_CONFIG.defaults.ageMin,
    preferred_age_max: PREFERENCES_CONFIG.defaults.ageMax,
    prefers_verified: PREFERENCES_CONFIG.defaults.prefersVerified,
    preferred_city: PREFERENCES_CONFIG.defaults.preferredCity,
    confidence_score: 0.0,
    events_analyzed: 0,
    activity_span_days: 0,
    inference_timestamp: new Date()
  };
}

/**
 * Apply decay to old signals
 * 
 * Reduces weight of old behavior data over time
 * Call periodically to "age out" old preferences
 * 
 * @param {number} daysSinceLastUpdate - Days since last preference update
 * @param {number} confidenceScore - Current confidence
 * @returns {number} Decayed confidence
 */
const applyConfidenceDecay = (daysSinceLastUpdate, confidenceScore) => {
  if (!Number.isFinite(daysSinceLastUpdate) || daysSinceLastUpdate < 0) {
    return confidenceScore;
  }

  // Decay formula: confidence drops 10% per 14 days of inactivity
  const decayFactor = Math.pow(0.9, Math.floor(daysSinceLastUpdate / 14));
  return Math.max(0, confidenceScore * decayFactor);
};

/**
 * Determine personalization strength based on confidence
 * 
 * @param {number} confidenceScore - 0-1
 * @returns {object} Personalization settings
 */
const getPersonalizationStrength = (confidenceScore) => {
  let boostMultiplier = 1.0;
  let maxBoostFactor = 1.0;
  let usePriceAffinity = false;
  let useAgeAffinity = false;
  let useVerifiedAffinity = false;
  let useCityAffinity = false;

  if (confidenceScore >= PREFERENCES_CONFIG.confidenceHighThreshold) {
    // High confidence: Use all boosters at full strength
    boostMultiplier = 1.0;
    maxBoostFactor = 1.15;
    usePriceAffinity = true;
    useAgeAffinity = true;
    useVerifiedAffinity = true;
    useCityAffinity = true;
  } else if (confidenceScore >= PREFERENCES_CONFIG.confidenceMediumThreshold) {
    // Medium confidence: Use boosters at 50% strength
    boostMultiplier = 0.5;
    maxBoostFactor = 1.08;
    usePriceAffinity = true;
    useAgeAffinity = true;
    useVerifiedAffinity = false; // Conservative
    useCityAffinity = false;      // Conservative
  } else {
    // Low confidence: minimal personalization
    boostMultiplier = 0.25;
    maxBoostFactor = 1.03;
    usePriceAffinity = false;
    useAgeAffinity = false;
    useVerifiedAffinity = false;
    useCityAffinity = false;
  }

  return {
    boostMultiplier,
    maxBoostFactor,
    usePriceAffinity,
    useAgeAffinity,
    useVerifiedAffinity,
    useCityAffinity,
    confidenceLevel: 
      confidenceScore >= PREFERENCES_CONFIG.confidenceHighThreshold ? 'high' :
      confidenceScore >= PREFERENCES_CONFIG.confidenceMediumThreshold ? 'medium' :
      'low'
  };
};

/**
 * Check if user should be personalized
 * 
 * Returns false for:
 * - New users (no preference profile)
 * - Low confidence profiles (not enough data)
 * - Users with old preference data (> 30 days)
 * 
 * @param {object} userProfile - User preference profile (or null)
 * @returns {boolean}
 */
const shouldPersonalize = (userProfile) => {
  if (!userProfile) {
    return false; // No profile = no personalization
  }

  if (!userProfile.confidence_score) {
    return false; // No confidence = don't personalize
  }

  if (userProfile.confidence_score < PREFERENCES_CONFIG.confidenceMediumThreshold) {
    return false; // Low confidence = don't personalize
  }

  // Check if profile is stale (> 30 days)
  if (userProfile.last_recalculated) {
    const lastUpdateMs = new Date(userProfile.last_recalculated).getTime();
    const nowMs = Date.now();
    const daysAgo = (nowMs - lastUpdateMs) / (1000 * 60 * 60 * 24);
    
    if (daysAgo > 30) {
      return false; // Profile too old, should recalculate
    }
  }

  return true;
};

module.exports = {
  inferUserPreferences,
  applyConfidenceDecay,
  getPersonalizationStrength,
  shouldPersonalize,
  getDefaultPreferences,
  calculateRecencyWeight,
  PREFERENCES_CONFIG
};
