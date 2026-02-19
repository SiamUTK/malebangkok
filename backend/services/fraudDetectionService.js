const { query } = require("../config/db");
const logger = require("../config/logger");
const { sendCriticalAlert, sendHighAlert, sendWarning } = require("./alertService");
const { buildCacheKey, getCache, setCache } = require("../utils/cache");

const RISK_WEIGHTS = Object.freeze({
  bookingVelocity: 22,
  paymentFailureRatio: 20,
  unusualPriceDeviation: 18,
  newAccountRisk: 12,
  ipReputationProxy: 14,
  retryBurstDetection: 14,
});

const RISK_BANDS = Object.freeze({
  LOW_MAX: 29,
  MEDIUM_MAX: 59,
  HIGH_MAX: 79,
});

const USER_SNAPSHOT_TTL_SECONDS = Number(process.env.FRAUD_USER_SNAPSHOT_TTL_SECONDS) || 20;
const GLOBAL_BASELINE_BOOKING_AMOUNT = Number(process.env.FRAUD_GLOBAL_BASELINE_AMOUNT) || 2500;

function toFiniteNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resolveRiskLevel(score) {
  if (score <= RISK_BANDS.LOW_MAX) {
    return "low";
  }

  if (score <= RISK_BANDS.MEDIUM_MAX) {
    return "medium";
  }

  if (score <= RISK_BANDS.HIGH_MAX) {
    return "high";
  }

  return "critical";
}

function bookingVelocitySignal(bookingVelocity) {
  const value = toFiniteNumber(bookingVelocity, 0);

  if (value <= 2) {
    return 0;
  }

  if (value <= 4) {
    return 0.35;
  }

  if (value <= 6) {
    return 0.7;
  }

  return 1;
}

function paymentFailureRatioSignal(ratio) {
  const value = clamp(toFiniteNumber(ratio, 0), 0, 1);

  if (value <= 0.2) {
    return 0;
  }

  if (value <= 0.4) {
    return 0.4;
  }

  if (value <= 0.6) {
    return 0.75;
  }

  return 1;
}

function unusualPriceDeviationSignal(deviationRatio) {
  const value = clamp(toFiniteNumber(deviationRatio, 0), 0, 10);

  if (value <= 0.35) {
    return 0;
  }

  if (value <= 0.75) {
    return 0.5;
  }

  if (value <= 1.2) {
    return 0.8;
  }

  return 1;
}

function newAccountRiskSignal(accountAgeHours) {
  const value = Math.max(0, toFiniteNumber(accountAgeHours, 9999));

  if (value >= 168) {
    return 0;
  }

  if (value >= 72) {
    return 0.35;
  }

  if (value >= 24) {
    return 0.7;
  }

  return 1;
}

function retryBurstSignal(retryBurstCount) {
  const value = Math.max(0, toFiniteNumber(retryBurstCount, 0));

  if (value <= 1) {
    return 0;
  }

  if (value <= 3) {
    return 0.5;
  }

  if (value <= 5) {
    return 0.8;
  }

  return 1;
}

function isPrivateOrLoopbackIpv4(ip) {
  const parts = String(ip || "").trim().split(".").map((value) => Number(value));
  if (parts.length !== 4 || parts.some((value) => Number.isNaN(value) || value < 0 || value > 255)) {
    return false;
  }

  if (parts[0] === 10 || parts[0] === 127) {
    return true;
  }

  if (parts[0] === 192 && parts[1] === 168) {
    return true;
  }

  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true;
  }

  return false;
}

function ipReputationProxySignal({ ip, ipVelocity }) {
  const normalizedVelocity = Math.max(0, toFiniteNumber(ipVelocity, 0));
  let score = 0;

  if (!ip) {
    score += 0.2;
  }

  if (isPrivateOrLoopbackIpv4(ip)) {
    score += 0.2;
  }

  if (normalizedVelocity >= 6) {
    score += 0.35;
  }

  if (normalizedVelocity >= 10) {
    score += 0.35;
  }

  return clamp(score, 0, 1);
}

function deriveEventType(contributions) {
  const eventMap = {
    bookingVelocity: "velocity_spike",
    paymentFailureRatio: "card_testing_pattern",
    unusualPriceDeviation: "abnormal_value_booking",
    newAccountRisk: "new_account_risk",
    ipReputationProxy: "ip_velocity_abuse",
    retryBurstDetection: "payment_retry_storm",
  };

  const entries = Object.entries(contributions || {});
  if (entries.length === 0) {
    return "risk_evaluated";
  }

  const top = entries.sort((a, b) => b[1] - a[1])[0];
  return eventMap[top[0]] || "risk_evaluated";
}

async function getUserRiskSnapshot(userId) {
  const normalizedUserId = Number(userId);
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    return {
      bookingVelocity: 0,
      paymentFailureRatio: 0,
      retryBurst: 0,
      accountAgeHours: 9999,
      userBaselineAmount: GLOBAL_BASELINE_BOOKING_AMOUNT,
      ipVelocity: 0,
      source: "default",
    };
  }

  const cacheKey = buildCacheKey("fraud:userRiskSnapshot", { userId: normalizedUserId });
  const cached = await getCache(cacheKey);
  if (cached) {
    return {
      ...cached,
      source: "cache",
    };
  }

  try {
    const [bookingVelocityRows, paymentRows, accountRows] = await Promise.all([
      query(
        `
          SELECT COUNT(*) AS bookingVelocity
          FROM bookings
          WHERE user_id = ?
            AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 MINUTE)
        `,
        [normalizedUserId]
      ),
      query(
        `
          SELECT
            SUM(CASE WHEN created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) AS totalAttempts24h,
            SUM(CASE WHEN created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 HOUR) AND status = 'failed' THEN 1 ELSE 0 END) AS failedAttempts24h,
            SUM(CASE WHEN created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 MINUTE) AND status = 'failed' THEN 1 ELSE 0 END) AS retryBurst5m,
            AVG(CASE WHEN created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY) AND status IN ('succeeded', 'paid') THEN amount ELSE NULL END) AS baselineAmount30d
          FROM payments
          WHERE user_id = ?
            AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)
        `,
        [normalizedUserId]
      ),
      query(
        `
          SELECT TIMESTAMPDIFF(HOUR, created_at, UTC_TIMESTAMP()) AS accountAgeHours
          FROM users
          WHERE id = ?
          LIMIT 1
        `,
        [normalizedUserId]
      ),
    ]);

    const paymentAggregate = paymentRows[0] || {};
    const attempts = Math.max(0, toFiniteNumber(paymentAggregate.totalAttempts24h, 0));
    const failures = Math.max(0, toFiniteNumber(paymentAggregate.failedAttempts24h, 0));

    const snapshot = {
      bookingVelocity: Math.max(0, toFiniteNumber(bookingVelocityRows[0]?.bookingVelocity, 0)),
      paymentFailureRatio: attempts > 0 ? clamp(failures / attempts, 0, 1) : 0,
      retryBurst: Math.max(0, toFiniteNumber(paymentAggregate.retryBurst5m, 0)),
      accountAgeHours: Math.max(0, toFiniteNumber(accountRows[0]?.accountAgeHours, 9999)),
      userBaselineAmount: Math.max(
        0,
        toFiniteNumber(paymentAggregate.baselineAmount30d, GLOBAL_BASELINE_BOOKING_AMOUNT)
      ),
      ipVelocity: 0,
      source: "db",
    };

    await setCache(cacheKey, snapshot, USER_SNAPSHOT_TTL_SECONDS);
    return snapshot;
  } catch (error) {
    logger.warn("fraud_user_snapshot_failed", {
      event: "fraud_user_snapshot_failed",
      userId: normalizedUserId,
      message: error.message,
    });

    return {
      bookingVelocity: 0,
      paymentFailureRatio: 0,
      retryBurst: 0,
      accountAgeHours: 9999,
      userBaselineAmount: GLOBAL_BASELINE_BOOKING_AMOUNT,
      ipVelocity: 0,
      source: "fail_open",
    };
  }
}

async function evaluateRisk(context = {}) {
  try {
    const normalizedContext = context && typeof context === "object" ? context : {};
    const normalizedUserId = Number(normalizedContext.userId);

    const snapshot = await getUserRiskSnapshot(normalizedUserId);

    const bookingAmount = Math.max(0, toFiniteNumber(normalizedContext.bookingAmount, 0));
    const bookingVelocity = Math.max(
      0,
      toFiniteNumber(normalizedContext.bookingVelocity, snapshot.bookingVelocity)
    );

    const explicitFailureRatio = toFiniteNumber(normalizedContext.paymentFailureRatio, NaN);
    const recentFailures = Math.max(0, toFiniteNumber(normalizedContext.recentFailures, NaN));
    const recentAttempts = Math.max(0, toFiniteNumber(normalizedContext.recentAttempts, NaN));
    const paymentFailureRatio = Number.isFinite(explicitFailureRatio)
      ? clamp(explicitFailureRatio, 0, 1)
      : Number.isFinite(recentFailures)
      ? clamp(recentFailures / Math.max(1, recentAttempts || recentFailures), 0, 1)
      : snapshot.paymentFailureRatio;

    const accountAgeHours = Math.max(
      0,
      toFiniteNumber(normalizedContext.accountAgeHours, snapshot.accountAgeHours)
    );
    const retryBurst = Math.max(0, toFiniteNumber(normalizedContext.retryBurst, snapshot.retryBurst));

    const userBaselineAmount = Math.max(
      0,
      toFiniteNumber(normalizedContext.userBaselineAmount, snapshot.userBaselineAmount)
    );
    const effectiveBaseline = userBaselineAmount > 0 ? userBaselineAmount : GLOBAL_BASELINE_BOOKING_AMOUNT;
    const priceDeviationRatio =
      effectiveBaseline > 0 ? Math.abs(bookingAmount - effectiveBaseline) / effectiveBaseline : 0;

    const ipVelocity = Math.max(0, toFiniteNumber(normalizedContext.ipVelocity, snapshot.ipVelocity));
    const ip = normalizedContext.ip ? String(normalizedContext.ip).trim() : null;

    const signalScores = {
      bookingVelocity: bookingVelocitySignal(bookingVelocity),
      paymentFailureRatio: paymentFailureRatioSignal(paymentFailureRatio),
      unusualPriceDeviation: unusualPriceDeviationSignal(priceDeviationRatio),
      newAccountRisk: newAccountRiskSignal(accountAgeHours),
      ipReputationProxy: ipReputationProxySignal({ ip, ipVelocity }),
      retryBurstDetection: retryBurstSignal(retryBurst),
    };

    const weightedContributions = Object.fromEntries(
      Object.entries(signalScores).map(([key, value]) => [key, Number((value * RISK_WEIGHTS[key]).toFixed(2))])
    );

    const scoreRaw = Object.values(weightedContributions).reduce(
      (total, contribution) => total + contribution,
      0
    );
    const riskScore = clamp(Math.round(scoreRaw), 0, 100);
    const riskLevel = resolveRiskLevel(riskScore);

    const result = {
      userId: Number.isFinite(normalizedUserId) ? normalizedUserId : null,
      bookingId: Number.isFinite(Number(normalizedContext.bookingId))
        ? Number(normalizedContext.bookingId)
        : null,
      riskScore,
      riskLevel,
      eventType: deriveEventType(weightedContributions),
      shouldBlock: shouldBlockTransaction({ riskLevel, riskScore }),
      requiresReview: riskLevel === "high" || riskLevel === "critical",
      action: riskLevel === "critical" ? "block_or_review" : riskLevel === "high" ? "allow_flag" : "allow",
      signals: {
        bookingVelocity,
        paymentFailureRatio,
        priceDeviationRatio: Number(priceDeviationRatio.toFixed(4)),
        accountAgeHours,
        ip,
        ipVelocity,
        retryBurst,
        userBaselineAmount: Number(effectiveBaseline.toFixed(2)),
        signalScores,
        weightedContributions,
      },
      evaluatedAt: new Date().toISOString(),
    };

    logger.info("fraud_risk_evaluated", {
      event: "fraud_risk_evaluated",
      userId: result.userId,
      bookingId: result.bookingId,
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      action: result.action,
    });

    return result;
  } catch (error) {
    logger.error("fraud_risk_evaluation_failed", {
      event: "fraud_risk_evaluation_failed",
      message: error.message,
    });

    return {
      userId: null,
      bookingId: null,
      riskScore: 0,
      riskLevel: "low",
      eventType: "risk_evaluation_failed_open",
      shouldBlock: false,
      requiresReview: false,
      action: "allow",
      signals: {
        failOpen: true,
        reason: error.message,
      },
      evaluatedAt: new Date().toISOString(),
    };
  }
}

async function recordFraudEvent(result = {}) {
  try {
    const normalizedUserId = Number(result.userId);
    if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
      logger.debug("fraud_event_skip_no_user", {
        event: "fraud_event_skip_no_user",
      });
      return null;
    }

    const normalizedBookingId = Number(result.bookingId);
    const riskScore = clamp(Math.round(toFiniteNumber(result.riskScore, 0)), 0, 100);
    const riskLevel = ["low", "medium", "high", "critical"].includes(result.riskLevel)
      ? result.riskLevel
      : resolveRiskLevel(riskScore);
    const eventType = String(result.eventType || "risk_evaluated").slice(0, 64);
    const signalsJson = JSON.stringify(result.signals || {});

    const insertResult = await query(
      `
        INSERT INTO fraud_events (
          user_id,
          booking_id,
          risk_score,
          risk_level,
          event_type,
          signals_json
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        normalizedUserId,
        Number.isFinite(normalizedBookingId) && normalizedBookingId > 0 ? normalizedBookingId : null,
        riskScore,
        riskLevel,
        eventType,
        signalsJson,
      ]
    );

    logger.info("fraud_event_recorded", {
      event: "fraud_event_recorded",
      userId: normalizedUserId,
      bookingId: Number.isFinite(normalizedBookingId) ? normalizedBookingId : null,
      riskScore,
      riskLevel,
      eventType,
      fraudEventId: insertResult.insertId,
    });

    if (riskLevel === "critical") {
      Promise.resolve(
        sendCriticalAlert({
          event: "critical_fraud_detected",
          title: "Critical fraud risk detected",
          message: "Transaction scored as critical risk",
          details: {
            userId: normalizedUserId,
            bookingId: Number.isFinite(normalizedBookingId) ? normalizedBookingId : null,
            riskScore,
            eventType,
          },
        })
      ).catch(() => {});
    } else if (riskLevel === "high") {
      Promise.resolve(
        sendHighAlert({
          event: "high_fraud_risk_flagged",
          title: "High fraud risk flagged",
          message: "Transaction allowed but flagged for review",
          details: {
            userId: normalizedUserId,
            bookingId: Number.isFinite(normalizedBookingId) ? normalizedBookingId : null,
            riskScore,
            eventType,
          },
        })
      ).catch(() => {});
    } else if (riskScore >= 40 && result.signals?.retryBurst >= 3) {
      Promise.resolve(
        sendWarning({
          event: "payment_failure_burst_warning",
          title: "Payment failure burst detected",
          message: "Potential card testing or retry burst observed",
          details: {
            userId: normalizedUserId,
            riskScore,
            retryBurst: result.signals.retryBurst,
          },
        })
      ).catch(() => {});
    }

    return insertResult.insertId;
  } catch (error) {
    logger.error("fraud_event_record_failed", {
      event: "fraud_event_record_failed",
      message: error.message,
    });
    return null;
  }
}

function shouldBlockTransaction(result = {}) {
  const riskLevel = String(result.riskLevel || "").toLowerCase();
  const riskScore = clamp(Math.round(toFiniteNumber(result.riskScore, 0)), 0, 100);

  if (riskLevel === "critical") {
    return true;
  }

  return riskScore >= 90;
}

module.exports = {
  RISK_WEIGHTS,
  evaluateRisk,
  recordFraudEvent,
  shouldBlockTransaction,
  getUserRiskSnapshot,
};
