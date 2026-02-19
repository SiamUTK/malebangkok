const { query } = require("../config/db");

async function hasGuideBookingConflict({ guideId, bookingDate, durationHours }) {
  const durationMinutes = Math.round(Number(durationHours) * 60);
  const sql = `
    SELECT id
    FROM bookings
    WHERE guide_id = ?
      AND status IN ('pending', 'confirmed', 'completed')
      AND booking_date < DATE_ADD(?, INTERVAL ? MINUTE)
      AND DATE_ADD(booking_date, INTERVAL ROUND(duration_hours * 60) MINUTE) > ?
    LIMIT 1
  `;

  const rows = await query(sql, [guideId, bookingDate, durationMinutes, bookingDate]);
  return rows.length > 0;
}

async function createBooking({
  userId,
  guideId,
  bookingDate,
  durationHours,
  totalPrice,
  baseAmount,
  peakAmount,
  weekendAmount,
  premiumAmount,
  premiumOptions,
  status = "pending",
  notes = null,
}) {
  const sql = `
    INSERT INTO bookings (
      user_id, guide_id, booking_date, duration_hours, total_price,
      base_amount, peak_amount, weekend_amount, premium_amount, premium_options,
      status, notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await query(sql, [
    userId,
    guideId,
    bookingDate,
    durationHours,
    totalPrice,
    baseAmount,
    peakAmount,
    weekendAmount,
    premiumAmount,
    premiumOptions ? JSON.stringify(premiumOptions) : null,
    status,
    notes,
  ]);
  return result.insertId;
}

async function createBookingAtomic(payload, connection) {
  if (!connection || typeof connection.execute !== "function") {
    throw new Error("createBookingAtomic requires an active mysql2 transaction connection");
  }

  const {
    userId,
    guideId,
    bookingDate,
    durationHours,
    totalPrice,
    baseAmount,
    peakAmount,
    weekendAmount,
    premiumAmount,
    premiumOptions,
    status = "pending",
    notes = null,
  } = payload || {};

  const normalizedGuideId = Number(guideId);
  const normalizedDurationHours = Number(durationHours);
  const durationMinutes = Math.round(normalizedDurationHours * 60);

  if (!Number.isFinite(normalizedGuideId) || normalizedGuideId <= 0) {
    throw new Error("Invalid guideId for createBookingAtomic");
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error("Invalid durationHours for createBookingAtomic");
  }

  if (!bookingDate) {
    throw new Error("bookingDate is required for createBookingAtomic");
  }

  // Guard lock for empty-overlap result: serializes booking creation per guide.
  await connection.execute(
    `
      SELECT id
      FROM guides
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [normalizedGuideId]
  );

  const [conflictRows] = await connection.execute(
    `
      SELECT id
      FROM bookings
      WHERE guide_id = ?
        AND status IN ('pending', 'confirmed')
        AND booking_date < DATE_ADD(?, INTERVAL ? MINUTE)
        AND booking_end_date > ?
      FOR UPDATE
    `,
    [normalizedGuideId, bookingDate, durationMinutes, bookingDate]
  );

  if (conflictRows.length > 0) {
    const conflictError = new Error("Selected time slot is not available");
    conflictError.code = "BOOKING_CONFLICT";
    throw conflictError;
  }

  const [result] = await connection.execute(
    `
      INSERT INTO bookings (
        user_id, guide_id, booking_date, duration_hours, total_price,
        base_amount, peak_amount, weekend_amount, premium_amount, premium_options,
        status, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      userId,
      normalizedGuideId,
      bookingDate,
      normalizedDurationHours,
      totalPrice,
      baseAmount,
      peakAmount,
      weekendAmount,
      premiumAmount,
      premiumOptions ? JSON.stringify(premiumOptions) : null,
      status,
      notes,
    ]
  );

  return result.insertId;
}

async function getBookingsByUser(userId) {
  const sql = `
    SELECT
      b.id,
      b.user_id,
      b.guide_id,
      g.name AS guide_name,
      b.booking_date,
      b.duration_hours,
      b.total_price,
      b.base_amount,
      b.peak_amount,
      b.weekend_amount,
      b.premium_amount,
      b.premium_options,
      b.status,
      b.payment_status,
      b.notes,
      b.created_at
    FROM bookings b
    INNER JOIN guides g ON g.id = b.guide_id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `;

  return query(sql, [userId]);
}

async function updateBookingStatus(bookingId, status) {
  const sql = `
    UPDATE bookings
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  const result = await query(sql, [status, bookingId]);
  return result.affectedRows > 0;
}

async function getBookingById(bookingId) {
  const sql = `
    SELECT *
    FROM bookings
    WHERE id = ?
    LIMIT 1
  `;
  const rows = await query(sql, [bookingId]);
  return rows[0] || null;
}

async function setBookingPaymentIntent(bookingId, paymentIntentId) {
  const sql = `
    UPDATE bookings
    SET payment_intent_id = ?, payment_status = 'requires_payment', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  const result = await query(sql, [paymentIntentId, bookingId]);
  return result.affectedRows > 0;
}

async function markBookingAsConfirmed(bookingId) {
  const sql = `
    UPDATE bookings
    SET status = 'confirmed', payment_status = 'paid', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  const result = await query(sql, [bookingId]);
  return result.affectedRows > 0;
}

module.exports = {
  hasGuideBookingConflict,
  createBooking,
  createBookingAtomic,
  getBookingsByUser,
  updateBookingStatus,
  getBookingById,
  setBookingPaymentIntent,
  markBookingAsConfirmed,
};
