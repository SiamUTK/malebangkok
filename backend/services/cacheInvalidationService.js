const logger = require("../config/logger");
const { deleteByPattern } = require("../utils/cache");

async function invalidateGuideList() {
  const deleted = await deleteByPattern("guides:list:*");
  logger.info("cache_invalidate_guide_list", {
    event: "cache_invalidate_guide_list",
    deleted,
  });
  return deleted;
}

async function invalidateGuide(id) {
  const guideId = Number(id);
  const deleted = Number.isFinite(guideId) && guideId > 0
    ? await deleteByPattern(`guides:detail:${guideId}:*`)
    : 0;

  logger.info("cache_invalidate_guide_detail", {
    event: "cache_invalidate_guide_detail",
    guideId: Number.isFinite(guideId) ? guideId : null,
    deleted,
  });

  return deleted;
}

async function invalidateMatching() {
  const deleted = await deleteByPattern("guides:match:*");
  logger.info("cache_invalidate_matching", {
    event: "cache_invalidate_matching",
    deleted,
  });
  return deleted;
}

module.exports = {
  invalidateGuideList,
  invalidateGuide,
  invalidateMatching,
};
