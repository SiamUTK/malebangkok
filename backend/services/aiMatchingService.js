const DEFAULTS = Object.freeze({
  preferredAgeMin: 24,
  preferredAgeMax: 40,
  priceMin: 1000,
  priceMax: 6000,
  verifiedOnly: false,
  minRating: 0,
  requireAvailability: true,
  preferredCity: "",
  priceSensitivity: 0.6,
  ratingWeight: 0.6,
  limit: 20,
});

const MAX_MATCH_RETURN_LIMIT = 50;

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value === 1;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no"].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function normalizePreferences(rawPreferences = {}) {
  const preferredAgeMinRaw = toNumber(rawPreferences.preferredAgeMin, DEFAULTS.preferredAgeMin);
  const preferredAgeMaxRaw = toNumber(rawPreferences.preferredAgeMax, DEFAULTS.preferredAgeMax);

  const preferredAgeMin = clamp(Math.min(preferredAgeMinRaw, preferredAgeMaxRaw), 18, 80);
  const preferredAgeMax = clamp(Math.max(preferredAgeMinRaw, preferredAgeMaxRaw), 18, 80);

  const priceMinRaw = Math.max(0, toNumber(rawPreferences.priceMin, DEFAULTS.priceMin));
  const priceMaxRaw = Math.max(0, toNumber(rawPreferences.priceMax, DEFAULTS.priceMax));
  const priceMin = Math.min(priceMinRaw, priceMaxRaw);
  const priceMax = Math.max(priceMinRaw, priceMaxRaw, priceMin + 1);

  return {
    preferredAgeMin,
    preferredAgeMax,
    priceMin,
    priceMax,
    verifiedOnly: toBoolean(rawPreferences.verifiedOnly, DEFAULTS.verifiedOnly),
    minRating: clamp(toNumber(rawPreferences.minRating, DEFAULTS.minRating), 0, 5),
    requireAvailability: toBoolean(rawPreferences.requireAvailability, DEFAULTS.requireAvailability),
    preferredCity: String(rawPreferences.preferredCity || DEFAULTS.preferredCity).trim(),
    priceSensitivity: clamp(toNumber(rawPreferences.priceSensitivity, DEFAULTS.priceSensitivity), 0, 1),
    ratingWeight: clamp(toNumber(rawPreferences.ratingWeight, DEFAULTS.ratingWeight), 0, 1),
    limit: clamp(toNumber(rawPreferences.limit, DEFAULTS.limit), 1, MAX_MATCH_RETURN_LIMIT),
  };
}

function normalizeGuide(guide) {
  const price = toNumber(guide.base_price, toNumber(guide.price_per_hour, 0));
  const rating = clamp(toNumber(guide.avg_rating, toNumber(guide.rating, 0)), 0, 5);
  const verificationStatus =
    guide.verification_status || (toBoolean(guide.verified, false) ? "verified" : "pending");
  const isAvailable = toBoolean(guide.is_available, true);

  return {
    ...guide,
    base_price: price,
    avg_rating: rating,
    verification_status: verificationStatus,
    is_available: isAvailable,
    city: String(guide.city || "").trim(),
    age: Number.isFinite(Number(guide.age)) ? Number(guide.age) : null,
  };
}

function scoreAge(age, preferredAgeMin, preferredAgeMax) {
  if (!Number.isFinite(age)) {
    return 0.45;
  }

  if (age >= preferredAgeMin && age <= preferredAgeMax) {
    return 1;
  }

  const distance = age < preferredAgeMin ? preferredAgeMin - age : age - preferredAgeMax;

  if (distance >= 25) {
    return 0.05;
  }

  const softPenalty = 1 - distance / 20;
  return clamp(softPenalty, 0.2, 0.95);
}

function scorePrice(price, preferences) {
  const { priceMin, priceMax, priceSensitivity } = preferences;

  if (!Number.isFinite(price) || price <= 0) {
    return 0.2;
  }

  const midpoint = (priceMin + priceMax) / 2;
  const halfRange = Math.max((priceMax - priceMin) / 2, 1);
  const distanceFromMidpoint = Math.abs(price - midpoint);
  const midpointCloseness = clamp(1 - distanceFromMidpoint / (halfRange * 1.5), 0, 1);

  if (price >= priceMin && price <= priceMax) {
    return midpointCloseness;
  }

  if (price > priceMax) {
    const overpricedRatio = (price - priceMax) / Math.max(priceMax, 1);
    const premiumTolerance = 1 - priceSensitivity;
    const expensivePenalty = overpricedRatio * (0.6 + priceSensitivity * 1.4);
    const compensated = midpointCloseness + premiumTolerance * 0.35 - expensivePenalty;
    return clamp(compensated, 0.05, 0.85);
  }

  const underRatio = (priceMin - price) / Math.max(priceMin, 1);
  const lowSidePenalty = underRatio * 0.25;
  return clamp(midpointCloseness - lowSidePenalty, 0.3, 0.95);
}

function scoreRating(rating, minRating) {
  const normalized = clamp(rating / 5, 0, 1);
  if (rating < minRating) {
    return clamp(normalized * 0.35, 0, 0.4);
  }
  return normalized;
}

function scoreVerification(verificationStatus) {
  return verificationStatus === "verified" ? 1 : 0;
}

function scoreAvailability(isAvailable, requireAvailability) {
  if (isAvailable) {
    return 1;
  }
  return requireAvailability ? 0 : 0.25;
}

function scoreCity(city, preferredCity) {
  if (!preferredCity) {
    return 0;
  }

  const normalizedGuideCity = String(city || "").trim().toLowerCase();
  const normalizedPreferredCity = String(preferredCity || "").trim().toLowerCase();

  if (!normalizedGuideCity || !normalizedPreferredCity) {
    return 0;
  }

  return normalizedGuideCity === normalizedPreferredCity ? 1 : 0;
}

function buildComponentWeights(ratingWeight) {
  const ratingImportance = clamp(ratingWeight, 0, 1);

  return {
    age: 22,
    price: 30 - ratingImportance * 12,
    rating: 18 + ratingImportance * 12,
    verification: 10,
    availability: 12,
    city: 8,
  };
}

function shouldFilterGuide(guide, preferences) {
  if (preferences.verifiedOnly && guide.verification_status !== "verified") {
    return { filteredOut: true, reason: "verified_only" };
  }

  if (preferences.requireAvailability && !guide.is_available) {
    return { filteredOut: true, reason: "availability_required" };
  }

  return { filteredOut: false, reason: null };
}

function computeMatchScore(guideInput, userPreferencesInput = {}) {
  const preferences = normalizePreferences(userPreferencesInput);
  const guide = normalizeGuide(guideInput || {});
  const filterResult = shouldFilterGuide(guide, preferences);

  if (filterResult.filteredOut) {
    return {
      matchScore: 0,
      matchBreakdown: {
        filteredOut: true,
        filterReason: filterResult.reason,
        components: {
          age: 0,
          price: 0,
          rating: 0,
          verification: 0,
          availability: 0,
          city: 0,
        },
        weightedPoints: {
          age: 0,
          price: 0,
          rating: 0,
          verification: 0,
          availability: 0,
          city: 0,
        },
        totalWeightedPoints: 0,
        totalPossiblePoints: 0,
      },
    };
  }

  const components = {
    age: scoreAge(guide.age, preferences.preferredAgeMin, preferences.preferredAgeMax),
    price: scorePrice(guide.base_price, preferences),
    rating: scoreRating(guide.avg_rating, preferences.minRating),
    verification: scoreVerification(guide.verification_status),
    availability: scoreAvailability(guide.is_available, preferences.requireAvailability),
    city: scoreCity(guide.city, preferences.preferredCity),
  };

  const weights = buildComponentWeights(preferences.ratingWeight);
  const weightedPoints = {
    age: components.age * weights.age,
    price: components.price * weights.price,
    rating: components.rating * weights.rating,
    verification: components.verification * weights.verification,
    availability: components.availability * weights.availability,
    city: components.city * weights.city,
  };

  const totalPossiblePoints =
    weights.age +
    weights.price +
    weights.rating +
    weights.verification +
    weights.availability +
    weights.city;

  const totalWeightedPoints =
    weightedPoints.age +
    weightedPoints.price +
    weightedPoints.rating +
    weightedPoints.verification +
    weightedPoints.availability +
    weightedPoints.city;

  const matchScore = Number(((totalWeightedPoints / totalPossiblePoints) * 100).toFixed(2));

  return {
    matchScore,
    matchBreakdown: {
      filteredOut: false,
      filterReason: null,
      components: {
        age: Number(components.age.toFixed(4)),
        price: Number(components.price.toFixed(4)),
        rating: Number(components.rating.toFixed(4)),
        verification: Number(components.verification.toFixed(4)),
        availability: Number(components.availability.toFixed(4)),
        city: Number(components.city.toFixed(4)),
      },
      weightedPoints: {
        age: Number(weightedPoints.age.toFixed(4)),
        price: Number(weightedPoints.price.toFixed(4)),
        rating: Number(weightedPoints.rating.toFixed(4)),
        verification: Number(weightedPoints.verification.toFixed(4)),
        availability: Number(weightedPoints.availability.toFixed(4)),
        city: Number(weightedPoints.city.toFixed(4)),
      },
      totalWeightedPoints: Number(totalWeightedPoints.toFixed(4)),
      totalPossiblePoints: Number(totalPossiblePoints.toFixed(4)),
      effectivePreferences: preferences,
    },
  };
}

function rankGuidesForUser(userPreferencesInput = {}, guidesInput = []) {
  const preferences = normalizePreferences(userPreferencesInput);
  const guides = Array.isArray(guidesInput) ? guidesInput : [];
  const hardLimit = clamp(preferences.limit, 1, MAX_MATCH_RETURN_LIMIT);

  const scored = [];

  for (let index = 0; index < guides.length; index += 1) {
    const rawGuide = guides[index];
    if (!rawGuide || typeof rawGuide !== "object") {
      continue;
    }

    const normalizedGuide = normalizeGuide(rawGuide);
    const { matchScore, matchBreakdown } = computeMatchScore(normalizedGuide, preferences);

    if (matchBreakdown.filteredOut) {
      continue;
    }

    scored.push({
      ...normalizedGuide,
      matchScore,
      matchBreakdown,
      __index: index,
    });
  }

  scored.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }

    if (a.__index !== b.__index) {
      return a.__index - b.__index;
    }

    return (a.id || 0) - (b.id || 0);
  });

  const limited = scored.slice(0, hardLimit).map(({ __index, ...guide }) => guide);
  return limited;
}

// ============================================================================
// PERSONALIZATION BOOST (AI Learning Layer)
// ============================================================================

/**
 * Calculate personalization boost factor
 * 
 * Purpose: Boost guides that match user's learned preferences
 * Range: 0.95-1.15 (max 15% boost for safety)
 * 
 * @param {object} userPreferences - User preference profile (from DB)
 * @param {object} guide - Guide data
 * @param {object} guideStats - Guide performance stats (from DB)
 * @returns {object} Boost breakdown
 */
function personalizationBoost(userPreferences, guide, guideStats = {}) {
  // If no user preferences, no boost
  if (!userPreferences) {
    return {
      boostFactor: 1.0,
      breakdown: {
        priceAffinity: 1.0,
        ageAffinity: 1.0,
        verifiedAffinity: 1.0,
        cityAffinity: 1.0,
        engagementBoost: 1.0
      },
      confidence: null,
      reason: 'no_preference_profile'
    };
  }

  // Extract confidence
  const confidence = Number(userPreferences.confidence_score) || 0;

  // If confidence too low, minimal boost
  if (confidence < 0.3) {
    return {
      boostFactor: 1.0,
      breakdown: {
        priceAffinity: 1.0,
        ageAffinity: 1.0,
        verifiedAffinity: 1.0,
        cityAffinity: 1.0,
        engagementBoost: 1.0
      },
      confidence,
      reason: 'low_confidence'
    };
  }

  const normalizedGuide = normalizeGuide(guide || {});
  const guidePrice = normalizedGuide.base_price;
  const guideAge = normalizedGuide.age;
  const isVerified = normalizedGuide.verification_status === 'verified';
  const guideCity = String(normalizedGuide.city || '').trim().toLowerCase();

  // Determine boost strength based on confidence
  let maxBoostDelta = 0.15;
  let boostStrength = 1.0;
  
  if (confidence < 0.5) {
    maxBoostDelta = 0.05; // Light boost for low confidence
    boostStrength = 0.5;
  } else if (confidence < 0.7) {
    maxBoostDelta = 0.10; // Medium boost
    boostStrength = 0.75;
  }
  // else: use full boost

  // 1. Price affinity boost
  let priceAffinity = 1.0;
  if (Number.isFinite(guidePrice) && guidePrice > 0) {
    const userPriceMin = Number(userPreferences.preferred_price_min) || 1500;
    const userPriceMax = Number(userPreferences.preferred_price_max) || 8000;
    const userPriceMid = (userPriceMin + userPriceMax) / 2;
    
    if (guidePrice >= userPriceMin && guidePrice <= userPriceMax) {
      // Within range - boost by up to 5%
      const distFromMid = Math.abs(guidePrice - userPriceMid);
      const range = (userPriceMax - userPriceMin) / 2;
      const proximity = 1 - (distFromMid / Math.max(range, 1));
      priceAffinity = 1.0 + (0.05 * proximity * boostStrength);
    } else if (guidePrice < userPriceMin) {
      // Cheaper than preferred - slight penalty
      priceAffinity = 0.98;
    } else {
      // More expensive than preferred - slight penalty (maybe user is flexible)
      priceAffinity = 0.99 + (0.01 * Math.min(0.05, (userPriceMax / guidePrice) - 1));
    }
  }

  // 2. Age affinity boost
  let ageAffinity = 1.0;
  if (Number.isFinite(guideAge) && guideAge > 0) {
    const userAgeMin = Number(userPreferences.preferred_age_min) || 24;
    const userAgeMax = Number(userPreferences.preferred_age_max) || 40;
    
    if (guideAge >= userAgeMin && guideAge <= userAgeMax) {
      // Within range - boost by up to 3%
      const ageMid = (userAgeMin + userAgeMax) / 2;
      const distFromMid = Math.abs(guideAge - ageMid);
      const ageRange = (userAgeMax - userAgeMin) / 2;
      const proximity = 1 - (distFromMid / Math.max(ageRange, 1));
      ageAffinity = 1.0 + (0.03 * proximity * boostStrength);
    } else {
      ageAffinity = 0.99 + 0.01;
    }
  }

  // 3. Verified affinity boost
  let verifiedAffinity = 1.0;
  const userPrefersVerified = Number(userPreferences.prefers_verified) === 1;
  if (userPrefersVerified) {
    if (isVerified) {
      // User prefers verified and guide is verified - boost 4%
      verifiedAffinity = 1.0 + (0.04 * boostStrength);
    } else {
      // User prefers verified but guide isn't - slight penalty
      verifiedAffinity = 0.98;
    }
  }

  // 4. City affinity boost
  let cityAffinity = 1.0;
  const userPreferredCity = String(userPreferences.preferred_city || '').trim().toLowerCase();
  if (userPreferredCity && userPreferredCity.length > 0) {
    if (guideCity === userPreferredCity) {
      // Exact city match - boost 2%
      cityAffinity = 1.0 + (0.02 * boostStrength);
    } else {
      cityAffinity = 0.99;
    }
  }

  // 5. Engagement bonus (if user has clicked this guide before)
  let engagementBoost = 1.0;
  if (guideStats && guideStats.total_clicks && guideStats.total_clicks > 0) {
    // User has clicked this guide, slight engagement bonus (3%)
    engagementBoost = 1.0 + (0.03 * boostStrength);
  }

  // Combine all factors
  let combinedBoost = 
    (priceAffinity - 1) + 
    (ageAffinity - 1) + 
    (verifiedAffinity - 1) + 
    (cityAffinity - 1) + 
    (engagementBoost - 1);

  // Cap the total boost
  combinedBoost = Math.max(-0.05, Math.min(maxBoostDelta, combinedBoost));
  const boostFactor = clamp(1.0 + combinedBoost, 0.95, 1.15);

  return {
    boostFactor: Number(boostFactor.toFixed(4)),
    breakdown: {
      priceAffinity: Number(priceAffinity.toFixed(4)),
      ageAffinity: Number(ageAffinity.toFixed(4)),
      verifiedAffinity: Number(verifiedAffinity.toFixed(4)),
      cityAffinity: Number(cityAffinity.toFixed(4)),
      engagementBoost: Number(engagementBoost.toFixed(4))
    },
    confidence: Number(confidence.toFixed(2)),
    reason: 'computed'
  };
}

/**
 * Rank guides with personalization boost
 * 
 * New enhanced version that applies learned preferences
 * 
 * @param {object} userPreferencesInput - Basic user preferences (from request)
 * @param {array} guidesInput - Array of guides
 * @param {object} userPersonalization - User's learned preferences (from DB)
 * @returns {array} Ranked guides with personalization scores
 */
function rankGuidesForUserWithPersonalization(userPreferencesInput = {}, guidesInput = [], userPersonalization = null) {
  // First: Apply basic rule-based ranking
  const basicRanked = rankGuidesForUser(userPreferencesInput, guidesInput);

  // If no personalization available, return basic ranking
  if (!userPersonalization || userPersonalization.confidence_score < 0.3) {
    return basicRanked.map(guide => ({
      ...guide,
      personalizationBoost: 1.0,
      personalizedScore: guide.matchScore
    }));
  }

  // Second: Apply personalization boost to each guide
  const personalized = basicRanked.map(guide => {
    // Get guide stats if available (in production, fetch from cache)
    const guideStats = {
      total_clicks: guide.total_clicks || 0,
      total_views: guide.total_views || 0
    };

    const boost = personalizationBoost(userPersonalization, guide, guideStats);
    const personalizedScore = Math.min(100, guide.matchScore * boost.boostFactor);

    return {
      ...guide,
      personalizationBoost: boost.boostFactor,
      personalizedScore: Number(personalizedScore.toFixed(2)),
      boostBreakdown: boost.breakdown,
      confidentScore: boost.confidence
    };
  });

  // Re-sort by personalized score
  personalized.sort((a, b) => {
    if (b.personalizedScore !== a.personalizedScore) {
      return b.personalizedScore - a.personalizedScore;
    }
    if (a.__index !== b.__index) {
      return a.__index - b.__index;
    }
    return (a.id || 0) - (b.id || 0);
  });

  return personalized;
}

module.exports = {
  computeMatchScore,
  rankGuidesForUser,
  rankGuidesForUserWithPersonalization,
  personalizationBoost,
  normalizePreferences,
  normalizeGuide,
  scoreAge,
  scorePrice,
  scoreRating,
  scoreVerification,
  scoreAvailability,
  scoreCity,
};