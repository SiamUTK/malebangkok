const { query } = require("../config/db");

async function createGuide({
  userId,
  name,
  bio,
  specialties,
  basePrice,
  age,
  city = "Bangkok",
  verificationStatus = "pending",
  isActive = 1,
}) {
  const sql = `
    INSERT INTO guides (user_id, name, bio, specialties, base_price, age, city, verification_status, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    isActive,
  ]);
  return result.insertId;
}

async function getAllGuides() {
  const sql = `
    SELECT id, user_id, name, bio, specialties, base_price, age, city, verification_status, avg_rating, total_reviews,
      (verification_status = 'verified') AS verified,
      is_available, is_active, created_at
    FROM guides
    WHERE is_active = 1
    ORDER BY created_at DESC
  `;
  return query(sql);
}

async function getGuideById(id) {
  const sql = `
    SELECT id, user_id, name, bio, specialties, base_price, age, city, verification_status, avg_rating, total_reviews,
      (verification_status = 'verified') AS verified,
      is_available, is_active, created_at
    FROM guides
    WHERE id = ?
    LIMIT 1
  `;
  const rows = await query(sql, [id]);
  return rows[0] || null;
}

async function getGuidesForMatching() {
  const sql = `
    SELECT id, name, base_price, age, verification_status, avg_rating, is_available, city
    FROM guides
    WHERE is_active = 1
  `;
  return query(sql);
}

module.exports = {
  createGuide,
  getAllGuides,
  getGuideById,
  getGuidesForMatching,
};
