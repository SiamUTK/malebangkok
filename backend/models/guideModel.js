const { query } = require("../config/db");

async function createGuide({
  name,
  bio,
  basePrice,
  age,
  verified = false,
}) {
  const sql = `
    INSERT INTO guides (name, bio, price_per_hour, age, verified)
    VALUES (?, ?, ?, ?, ?)
  `;

  const result = await query(sql, [
    name,
    bio,
    basePrice,
    age,
    verified ? 1 : 0,
  ]);

  return result.insertId;
}

async function getAllGuides() {
  const sql = `
    SELECT id, name, bio, price_per_hour, age, verified, rating, created_at
    FROM guides
    ORDER BY created_at DESC
  `;

  return query(sql);
}

async function getGuideById(id) {
  const sql = `
    SELECT id, name, bio, price_per_hour, age, verified, rating, created_at
    FROM guides
    WHERE id = ?
    LIMIT 1
  `;

  const rows = await query(sql, [id]);
  return rows[0] || null;
}

async function getGuidesForMatching() {
  const sql = `
    SELECT id, name, price_per_hour, age, verified, rating
    FROM guides
  `;

  return query(sql);
}

async function updateGuideById(id, { name, bio, basePrice, age, verified }) {
  const sql = `
    UPDATE guides
    SET name = ?,
        bio = ?,
        price_per_hour = ?,
        age = ?,
        verified = ?,
        created_at = created_at
    WHERE id = ?
    LIMIT 1
  `;

  const result = await query(sql, [
    name,
    bio,
    basePrice,
    age,
    verified ? 1 : 0,
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
  updateGuideById,
  deleteGuideById,
};
