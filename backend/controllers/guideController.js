const {
  createGuide,
  getAllGuides,
  getGuideById,
  getGuidesForMatching,
} = require("../models/guideModel");
const { findUserById } = require("../models/userModel");
const { rankGuidesForUser } = require("../services/aiMatchingService");
const { AppError } = require("../middleware/errorMiddleware");

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
    const guides = await getAllGuides();
    return res.status(200).json({ guides });
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
    const guides = await getGuidesForMatching();
    const ranked = rankGuidesForUser(req.body || {}, guides);
    return res.status(200).json({ guides: ranked });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createGuideHandler,
  getGuidesHandler,
  getGuideByIdHandler,
  getRecommendedGuidesHandler,
};
