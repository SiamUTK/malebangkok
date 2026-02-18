const PEAK_HOUR_START = Number(process.env.PEAK_HOUR_START) || 18;
const PEAK_HOUR_END = Number(process.env.PEAK_HOUR_END) || 23;
const PEAK_MULTIPLIER = Number(process.env.PEAK_HOUR_MULTIPLIER) || 1.2;
const WEEKEND_MULTIPLIER = Number(process.env.WEEKEND_MULTIPLIER) || 1.15;

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function calculateDynamicPricing({ basePrice, durationHours, bookingDateTime, premiumOptions = [] }) {
  const safeBasePrice = toNumber(basePrice);
  const safeDurationHours = toNumber(durationHours, 1);
  const bookingDate = new Date(bookingDateTime);
  if (Number.isNaN(bookingDate.getTime())) {
    throw new Error("Invalid bookingDateTime");
  }

  const hour = bookingDate.getHours();
  const day = bookingDate.getDay();

  const isPeakHour = hour >= PEAK_HOUR_START && hour <= PEAK_HOUR_END;
  const isWeekend = day === 0 || day === 6;

  const safePremiumOptions = Array.isArray(premiumOptions) ? premiumOptions : [];
  const premiumTotal = safePremiumOptions.reduce((acc, option) => acc + toNumber(option.price), 0);
  const baseAmount = safeBasePrice * safeDurationHours;
  const peakAmount = isPeakHour ? baseAmount * (PEAK_MULTIPLIER - 1) : 0;
  const weekendAmount = isWeekend ? baseAmount * (WEEKEND_MULTIPLIER - 1) : 0;
  const total = baseAmount + peakAmount + weekendAmount + premiumTotal;

  return {
    currency: "thb",
    baseAmount: Number(baseAmount.toFixed(2)),
    peakAmount: Number(peakAmount.toFixed(2)),
    weekendAmount: Number(weekendAmount.toFixed(2)),
    premiumAmount: Number(premiumTotal.toFixed(2)),
    totalAmount: Number(total.toFixed(2)),
    appliedRules: {
      isPeakHour,
      isWeekend,
      peakMultiplier: isPeakHour ? PEAK_MULTIPLIER : 1,
      weekendMultiplier: isWeekend ? WEEKEND_MULTIPLIER : 1,
    },
  };
}

module.exports = {
  calculateDynamicPricing,
};