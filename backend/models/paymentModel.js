const { query } = require("../config/db");

async function createPaymentRecord({
  bookingId,
  userId,
  guideId,
  amount,
  currency,
  stripePaymentIntentId,
  status = "pending",
}) {
  const sql = `
    INSERT INTO payments (booking_id, user_id, guide_id, amount, currency, stripe_payment_intent_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const result = await query(sql, [
    bookingId,
    userId,
    guideId,
    amount,
    currency,
    stripePaymentIntentId,
    status,
  ]);
  return result.insertId;
}

async function updatePaymentStatusByIntent(stripePaymentIntentId, status, rawPayload) {
  const sql = `
    UPDATE payments
    SET status = ?, provider_payload = ?, updated_at = CURRENT_TIMESTAMP
    WHERE stripe_payment_intent_id = ?
  `;
  const result = await query(sql, [status, rawPayload ? JSON.stringify(rawPayload) : null, stripePaymentIntentId]);
  return result.affectedRows > 0;
}

async function getPaymentByIntentId(stripePaymentIntentId) {
  const sql = `
    SELECT *
    FROM payments
    WHERE stripe_payment_intent_id = ?
    LIMIT 1
  `;
  const rows = await query(sql, [stripePaymentIntentId]);
  return rows[0] || null;
}

async function getLatestPaymentByBookingId(bookingId) {
  const sql = `
    SELECT *
    FROM payments
    WHERE booking_id = ?
    ORDER BY id DESC
    LIMIT 1
  `;

  const rows = await query(sql, [bookingId]);
  return rows[0] || null;
}

module.exports = {
  createPaymentRecord,
  updatePaymentStatusByIntent,
  getPaymentByIntentId,
  getLatestPaymentByBookingId,
};