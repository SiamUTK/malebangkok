function normalizeScore(value, min, max) {
  if (max <= min) {
    return 0;
  }
  const clamped = Math.max(min, Math.min(max, value));
  return (clamped - min) / (max - min);
}

function scoreGuide(guide, preferences) {
  const {
    preferredAgeMin = 18,
    preferredAgeMax = 60,
    priceMin = 0,
    priceMax = 100000,
    verifiedOnly = false,
    minRating = 0,
    requireAvailability = true,
  } = preferences;

  const ageScore = guide.age
    ? 1 - Math.abs(normalizeScore(guide.age, preferredAgeMin, preferredAgeMax) - 0.5)
    : 0.25;

  const priceScore = guide.base_price
    ? 1 - Math.abs(normalizeScore(guide.base_price, priceMin, priceMax) - 0.5)
    : 0.25;

  const verifiedScore = guide.verification_status === "verified" ? 1 : verifiedOnly ? 0 : 0.4;
  const ratingScore = guide.avg_rating ? normalizeScore(guide.avg_rating, minRating, 5) : 0.3;
  const availabilityScore = guide.is_available ? 1 : requireAvailability ? 0 : 0.2;

  const totalScore =
    ageScore * 0.15 +
    priceScore * 0.25 +
    verifiedScore * 0.2 +
    ratingScore * 0.2 +
    availabilityScore * 0.2;

  return Number((totalScore * 100).toFixed(2));
}

function rankGuidesForUser(preferences, guides) {
  return guides
    .map((guide) => ({
      ...guide,
      matchingScore: scoreGuide(guide, preferences),
    }))
    .sort((a, b) => b.matchingScore - a.matchingScore);
}

module.exports = {
  rankGuidesForUser,
  scoreGuide,
};