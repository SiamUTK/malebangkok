const { query } = require("../config/db");

const PAGINATION_DEFAULT_LIMIT = 20;
const PAGINATION_MAX_LIMIT = 50;
const MATCHING_DEFAULT_LIMIT = 300;
const MATCHING_MAX_LIMIT = 500;

function parseBoolean(value) {
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

  return null;
}

function clampInt(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  const normalized = Math.trunc(numeric);
  return Math.max(min, Math.min(max, normalized));
}

function toFiniteNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeCity(value) {
  const city = String(value || "").trim();
  return city ? city : null;
}

function normalizeGuideFilters(filters = {}) {
  const page = clampInt(filters.page, 1, 100000, 1);
  const limit = clampInt(filters.limit, 1, PAGINATION_MAX_LIMIT, PAGINATION_DEFAULT_LIMIT);
  const verifiedOnly = parseBoolean(filters.verifiedOnly);
  const city = normalizeCity(filters.city);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    verifiedOnly,
    city,
  };
}

function getBaseGuideSelect() {
  return `
    SELECT
      id,
      user_id,
      name,
      bio,
      specialties,
      base_price,
      base_price AS price_per_hour,
      age,
      city,
      verification_status,
      CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END AS verified,
      avg_rating,
      avg_rating AS rating,
      total_reviews,
      is_available,
      is_active,
      created_at,
      updated_at
    FROM guides
  `;
}

async function createGuide({
  userId,
  name,
  bio,
  specialties = null,
  basePrice,
  age,
  city = "Bangkok",
  verificationStatus = "pending",
}) {
  const sql = `
    INSERT INTO guides (user_id, name, bio, specialties, base_price, age, city, verification_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await query(sql, [
    userId,
    name,
    bio,
    specialties,
    basePrice,
    age,
    city,
    verificationStatus,
  ]);

  return result.insertId;
}

async function getAllGuides(filters = {}) {
  const normalized = normalizeGuideFilters(filters);
  const whereParts = ["is_active = 1"];
  const params = [];

  if (normalized.verifiedOnly === true) {
    whereParts.push("verification_status = 'verified'");
  }

  if (normalized.city) {
    whereParts.push("city = ?");
    params.push(normalized.city);
  }

  const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

  const countRows = await query(
    `
      SELECT COUNT(*) AS total
      FROM guides
      ${whereClause}
    `,
    params
  );

  const total = Number(countRows[0]?.total || 0);
  const totalPages = total > 0 ? Math.ceil(total / normalized.limit) : 0;

  const data = await query(
    `
      ${getBaseGuideSelect()}
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
    [...params, normalized.limit, normalized.offset]
  );

  return {
    data,
    pagination: {
      page: normalized.page,
      limit: normalized.limit,
      total,
      totalPages,
      hasNext: normalized.page < totalPages,
      hasPrev: normalized.page > 1,
    },
  };
}

async function getGuideById(id) {
  const rows = await query(
    `
      ${getBaseGuideSelect()}
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function getGuidesForMatchingPrefilter(preferences = {}) {
  const requireAvailability = parseBoolean(preferences.requireAvailability);
  const verifiedOnly = parseBoolean(preferences.verifiedOnly);
  const city = normalizeCity(preferences.preferredCity || preferences.city);

  const rawPriceMin = Math.max(0, toFiniteNumber(preferences.priceMin, 1000));
  const rawPriceMax = Math.max(0, toFiniteNumber(preferences.priceMax, 6000));
  const priceMin = Math.min(rawPriceMin, rawPriceMax);
  const priceMax = Math.max(rawPriceMin, rawPriceMax, priceMin + 1);

  const windowPadding = Math.max(500, Math.round((priceMax - priceMin) * 0.25));
  const effectivePriceMin = Math.max(0, priceMin - windowPadding);
  const effectivePriceMax = priceMax + windowPadding;

  const requestedLimit = clampInt(preferences.prefilterLimit, 1, MATCHING_MAX_LIMIT, MATCHING_DEFAULT_LIMIT);
  const prefilterLimit = Math.min(requestedLimit, MATCHING_MAX_LIMIT);

  const whereParts = ["is_active = 1", "base_price BETWEEN ? AND ?"];
  const params = [effectivePriceMin, effectivePriceMax];

  if (requireAvailability !== false) {
    whereParts.push("is_available = 1");
  }

  if (verifiedOnly === true) {
    whereParts.push("verification_status = 'verified'");
  }

  if (city) {
    whereParts.push("city = ?");
    params.push(city);
  }

  const rows = await query(
    `
      ${getBaseGuideSelect()}
      WHERE ${whereParts.join(" AND ")}
      ORDER BY avg_rating DESC, created_at DESC
      LIMIT ?
    `,
    [...params, prefilterLimit]
  );

  return {
    guides: rows,
    filtersApplied: {
      isActive: true,
      requireAvailability: requireAvailability !== false,
      verifiedOnly: verifiedOnly === true,
      city,
      effectivePriceMin,
      effectivePriceMax,
      prefilterLimit,
    },
  };
}

async function getGuidesForMatching(preferences = {}) {
  const prefiltered = await getGuidesForMatchingPrefilter(preferences);
  return prefiltered.guides;
}

async function updateGuideById(id, { name, bio, basePrice, age, verified }) {
  const verificationStatus = verified ? "verified" : "pending";

  const sql = `
    UPDATE guides
    SET name = ?,
        bio = ?,
        base_price = ?,
        age = ?,
        verification_status = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    LIMIT 1
  `;

  const result = await query(sql, [
    name,
    bio,
    basePrice,
    age,
    verificationStatus,
    id,
  ]);

  return result.affectedRows > 0;
}

async function deleteGuideById(id) {
  const sql = `
    DELETE FROM guides
    WHERE id = ?
    LIMIT 1
  `;

  const result = await query(sql, [id]);
  return result.affectedRows > 0;
}

module.exports = {
  createGuide,
  getAllGuides,
  getGuideById,
  getGuidesForMatching,
  getGuidesForMatchingPrefilter,
  updateGuideById,
  deleteGuideById,
  normalizeGuideFilters,
};
