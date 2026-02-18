const { query } = require("../config/db");

async function upsertCommissionByBooking({
  bookingId,
  guideId,
  grossAmount,
  platformRate,
  platformAmount,
  guideAmount,
  status = "pending",
}) {
  const sql = `
    INSERT INTO commissions (booking_id, guide_id, gross_amount, platform_rate, platform_amount, guide_amount, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      gross_amount = VALUES(gross_amount),
      platform_rate = VALUES(platform_rate),
      platform_amount = VALUES(platform_amount),
      guide_amount = VALUES(guide_amount),
      status = VALUES(status),
      updated_at = CURRENT_TIMESTAMP
  `;

  const result = await query(sql, [
    bookingId,
    guideId,
    grossAmount,
    platformRate,
    platformAmount,
    guideAmount,
    status,
  ]);

  return result.insertId || null;
}

async function getCommissionByBookingId(bookingId) {
  const rows = await query(
    `
      SELECT *
      FROM commissions
      WHERE booking_id = ?
      LIMIT 1
    `,
    [bookingId]
  );

  return rows[0] || null;
}

module.exports = {
  upsertCommissionByBooking,
  getCommissionByBookingId,
};
