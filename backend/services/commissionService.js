function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function calculateCommission({ bookingTotal, customRate }) {
  const baseRate = Number.isFinite(Number(customRate))
    ? Number(customRate)
    : Number(process.env.DEFAULT_COMMISSION_RATE || 0.2);

  const platformRate = clampNumber(baseRate, 0, 0.95);
  const total = Math.max(0, Number(bookingTotal) || 0);
  const platformAmount = Number((total * platformRate).toFixed(2));
  const guideAmount = Number((total - platformAmount).toFixed(2));

  return {
    platformRate,
    platformAmount,
    guideAmount,
  };
}

module.exports = {
  calculateCommission,
};