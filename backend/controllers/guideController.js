const {
  createGuide,
  getAllGuides,
  getGuideById,
  getGuidesForMatchingPrefilter,
  updateGuideById,
  deleteGuideById,
} = require("../models/guideModel");
const { findUserById } = require("../models/userModel");
const { rankGuidesForUser, normalizePreferences } = require("../services/aiMatchingService");
const { AppError } = require("../middleware/errorMiddleware");
const logger = require("../config/logger");
const { getCache, setCache, buildCacheKey } = require("../utils/cache");
const {
  invalidateGuideList,
  invalidateGuide,
  invalidateMatching,
} = require("../services/cacheInvalidationService");

const GUIDES_LIST_CACHE_TTL_SECONDS = Number(process.env.GUIDES_LIST_CACHE_TTL_SECONDS || 60);
const GUIDES_MATCH_CACHE_TTL_SECONDS = Number(process.env.GUIDES_MATCH_CACHE_TTL_SECONDS || 45);
const GUIDES_MATCH_CACHE_MIN_CANDIDATES = Number(process.env.GUIDES_MATCH_CACHE_MIN_CANDIDATES || 120);

async function createGuideHandler(req, res, next) {
  try {
    const { userId, name, bio, specialties, basePrice, age, city, verified } = req.body;

    const normalizedPrice = Number(basePrice);
    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      throw new AppError("basePrice must be a positive number", 400);
    }

    const targetUser = await findUserById(Number(userId));
    if (!targetUser) {
      throw new AppError("Target user not found", 404);
    }

    if (targetUser.role !== "guide") {
      throw new AppError("Target user must have role 'guide'", 400);
    }

    const guideId = await createGuide({
      userId: Number(userId),
      name: name.trim(),
      bio: bio.trim(),
      specialties: specialties ? specialties.trim() : null,
      basePrice: normalizedPrice,
      age: age || null,
      city: city || "Bangkok",
      verificationStatus: verified ? "verified" : "pending",
    });

    const guide = await getGuideById(guideId);

    await Promise.allSettled([
      invalidateGuideList(),
      invalidateMatching(),
      invalidateGuide(guideId),
    ]);

    return res.status(201).json({
      message: "Guide created successfully",
      guide,
    });
  } catch (error) {
    return next(error);
  }
}

async function getGuidesHandler(req, res, next) {
  try {
    const page = Number(req.query.page || 1);
    const requestedLimit = Number(req.query.limit || 20);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50) : 20;
    const verifiedOnly = req.query.verifiedOnly;
    const city = typeof req.query.city === "string" ? req.query.city.trim() : "";

    const cacheKey = buildCacheKey("guides:list", {
      page: Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1,
      limit,
      verifiedOnly: typeof verifiedOnly === "undefined" ? null : verifiedOnly,
      city: city || null,
    });

    const cached = await getCache(cacheKey);
    if (cached && Array.isArray(cached.data) && cached.pagination) {
      return res.status(200).json({
        data: cached.data,
        pagination: cached.pagination,
        guides: cached.data,
      });
    }

    const result = await getAllGuides({
      page: Number.isFinite(page) && page > 0 ? Math.trunc(page) : 1,
      limit,
      verifiedOnly,
      city: city || null,
    });

    await setCache(
      cacheKey,
      {
        data: result.data,
        pagination: result.pagination,
      },
      GUIDES_LIST_CACHE_TTL_SECONDS
    );

    return res.status(200).json({
      data: result.data,
      pagination: result.pagination,
      guides: result.data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getGuideByIdHandler(req, res, next) {
  try {
    const guideId = Number(req.params.id);

    if (Number.isNaN(guideId)) {
      return res.status(400).json({ message: "Guide id must be a number" });
    }

    const guide = await getGuideById(guideId);

    if (!guide) {
      return res.status(404).json({ message: "Guide not found" });
    }

    return res.status(200).json({ guide });
  } catch (error) {
    return next(error);
  }
}

async function getRecommendedGuidesHandler(req, res, next) {
  try {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      throw new AppError("Invalid matching payload", 400);
    }

    const preferences = normalizePreferences(req.body || {});
    const matchCacheKey = buildCacheKey("guides:match", preferences);

    const personalizationConfidence = Number(req.body?.personalizationConfidence || 0);
    const highlyPersonalized =
      req.body?.personalized === true ||
      Boolean(req.body?.userPreferenceProfileId) ||
      personalizationConfidence >= 0.7;

    const eligibleForCache = !highlyPersonalized;
    if (eligibleForCache) {
      const cached = await getCache(matchCacheKey);
      if (cached && Array.isArray(cached.guides) && cached.meta) {
        return res.status(200).json(cached);
      }
    }

    const prefiltered = await getGuidesForMatchingPrefilter(preferences);
    const ranked = rankGuidesForUser(preferences, prefiltered.guides || []);

    const responsePayload = {
      guides: ranked,
      meta: {
        candidatesEvaluated: Array.isArray(prefiltered.guides) ? prefiltered.guides.length : 0,
        returned: ranked.length,
        filtersApplied: prefiltered.filtersApplied,
      },
    };

    // Short-lived cache for broad/non-personalized traffic only.
    // Personal user-specific ranking should bypass cache to avoid stale personalization.
    if (eligibleForCache && responsePayload.meta.candidatesEvaluated >= GUIDES_MATCH_CACHE_MIN_CANDIDATES) {
      await setCache(matchCacheKey, responsePayload, GUIDES_MATCH_CACHE_TTL_SECONDS);
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    return next(error);
  }
}

async function updateGuideHandler(req, res, next) {
  try {
    const guideId = Number(req.params.id);
    const { name, bio, basePrice, age, verified } = req.body;

    if (!Number.isInteger(guideId) || guideId <= 0) {
      throw new AppError("Guide id must be a positive number", 400);
    }

    const normalizedPrice = Number(basePrice);
    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      throw new AppError("basePrice must be a positive number", 400);
    }

    const updated = await updateGuideById(guideId, {
      name: name.trim(),
      bio: bio.trim(),
      basePrice: normalizedPrice,
      age: age || null,
      verified: Boolean(verified),
    });

    if (!updated) {
      throw new AppError("Guide not found", 404);
    }

    const guide = await getGuideById(guideId);

    await Promise.allSettled([
      invalidateGuideList(),
      invalidateMatching(),
      invalidateGuide(guideId),
    ]).then((results) => {
      const rejected = results.filter((item) => item.status === "rejected");
      if (rejected.length > 0) {
        logger.warn("cache_invalidation_partial_failure", {
          event: "cache_invalidation_partial_failure",
          guideId,
          rejectedCount: rejected.length,
        });
      }
    });

    return res.status(200).json({ message: "Guide updated successfully", guide });
  } catch (error) {
    return next(error);
  }
}

async function deleteGuideHandler(req, res, next) {
  try {
    const guideId = Number(req.params.id);

    if (!Number.isInteger(guideId) || guideId <= 0) {
      throw new AppError("Guide id must be a positive number", 400);
    }

    const deleted = await deleteGuideById(guideId);

    if (!deleted) {
      throw new AppError("Guide not found", 404);
    }

    await Promise.allSettled([
      invalidateGuideList(),
      invalidateMatching(),
      invalidateGuide(guideId),
    ]);

    return res.status(200).json({ message: "Guide deleted successfully" });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createGuideHandler,
  getGuidesHandler,
  getGuideByIdHandler,
  getRecommendedGuidesHandler,
  updateGuideHandler,
  deleteGuideHandler,
};
