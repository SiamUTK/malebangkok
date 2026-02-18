const { query } = require("../config/db");

async function createReview({ bookingId, userId, guideId, rating, comment }) {
  const sql = `
    INSERT INTO reviews (booking_id, user_id, guide_id, rating, comment, status)
    VALUES (?, ?, ?, ?, ?, 'published')
  `;
  const result = await query(sql, [bookingId, userId, guideId, rating, comment]);
  return result.insertId;
}

module.exports = {
  createReview,
};