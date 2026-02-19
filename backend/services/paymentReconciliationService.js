const crypto = require("crypto");
const { query } = require("../config/db");
const logger = require("../config/logger");
const { stripe } = require("../config/stripe");
const { sendCriticalAlert, sendHighAlert } = require("./alertService");

const ANOMALY_TYPES = Object.freeze({
  MISSING_PAYMENT_RECORD: "missing_payment_record",
  STATUS_MISMATCH: "status_mismatch",
  AMOUNT_MISMATCH: "amount_mismatch",
  ORPHAN_PAYMENT: "orphan_payment",
  DUPLICATE_INTENT: "duplicate_intent",
  BOOKING_WITHOUT_SUCCESSFUL_PAYMENT: "booking_without_successful_payment",
});

const STRIPE_SUCCESS_STATUSES = new Set(["succeeded"]);
const DB_SUCCESS_STATUSES = new Set(["succeeded", "paid"]);

const DEFAULT_BATCH_SIZE = Number(process.env.RECON_BATCH_SIZE) || 200;
const STRIPE_VERIFY_ENABLED = String(process.env.RECON_STRIPE_VERIFY_ENABLED || "true").toLowerCase() === "true";
const STRIPE_VERIFY_LIMIT_PER_RUN = Number(process.env.RECON_STRIPE_VERIFY_LIMIT_PER_RUN) || 250;
const STRIPE_VERIFY_PAUSE_MS = Number(process.env.RECON_STRIPE_VERIFY_PAUSE_MS) || 40;
const STRIPE_VERIFY_TIMEOUT_MS = Number(process.env.RECON_STRIPE_VERIFY_TIMEOUT_MS) || 6000;
const RECON_LOOKBACK_HOURS = Number(process.env.RECON_LOOKBACK_HOURS) || 48;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toFiniteNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function generateRunId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = crypto.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function classifyAnomaly(result = {}) {
  const type = String(result.anomalyType || "");

  if (type === ANOMALY_TYPES.AMOUNT_MISMATCH || type === ANOMALY_TYPES.DUPLICATE_INTENT) {
    return "critical";
  }

  if (
    type === ANOMALY_TYPES.ORPHAN_PAYMENT ||
    type === ANOMALY_TYPES.BOOKING_WITHOUT_SUCCESSFUL_PAYMENT ||
    type === ANOMALY_TYPES.STATUS_MISMATCH
  ) {
    return "high";
  }

  return "low";
}

function checkPaymentConsistency(row = {}) {
  const findings = [];

  const paymentStatus = normalizeStatus(row.payment_status);
  const bookingStatus = normalizeStatus(row.booking_status);
  const bookingPaymentStatus = normalizeStatus(row.booking_payment_status);

  const paymentAmount = toFiniteNumber(row.payment_amount, 0);
  const bookingAmount = toFiniteNumber(row.booking_total_price, 0);

  const hasPaymentRecord = !!row.payment_id;
  const hasBookingRecord = !!row.booking_id;
  const hasStripeIntent = !!row.stripe_payment_intent_id;

  if (!hasBookingRecord && hasPaymentRecord) {
    findings.push({
      anomalyType: ANOMALY_TYPES.ORPHAN_PAYMENT,
      bookingId: null,
      paymentId: row.payment_id,
      stripePaymentIntent: row.stripe_payment_intent_id || null,
      details: {
        reason: "payment references missing booking",
        paymentStatus,
      },
    });
    return findings;
  }

  if (hasBookingRecord && !hasPaymentRecord && hasStripeIntent) {
    findings.push({
      anomalyType: ANOMALY_TYPES.MISSING_PAYMENT_RECORD,
      bookingId: row.booking_id,
      paymentId: null,
      stripePaymentIntent: row.stripe_payment_intent_id,
      details: {
        reason: "booking has payment_intent_id without matching payment row",
        bookingStatus,
        bookingPaymentStatus,
      },
    });
  }

  if (hasBookingRecord && hasPaymentRecord && bookingAmount > 0) {
    const delta = Math.abs(paymentAmount - bookingAmount);
    if (delta > 0.01) {
      findings.push({
        anomalyType: ANOMALY_TYPES.AMOUNT_MISMATCH,
        bookingId: row.booking_id,
        paymentId: row.payment_id,
        stripePaymentIntent: row.stripe_payment_intent_id || null,
        details: {
          paymentAmount,
          bookingAmount,
          delta,
        },
      });
    }
  }

  if (hasBookingRecord && hasPaymentRecord) {
    const paymentSucceeded = DB_SUCCESS_STATUSES.has(paymentStatus);
    const bookingMarkedPaid = bookingPaymentStatus === "paid";
    const bookingConfirmedOrCompleted = bookingStatus === "confirmed" || bookingStatus === "completed";

    if (paymentSucceeded && (!bookingMarkedPaid || !bookingConfirmedOrCompleted)) {
      findings.push({
        anomalyType: ANOMALY_TYPES.STATUS_MISMATCH,
        bookingId: row.booking_id,
        paymentId: row.payment_id,
        stripePaymentIntent: row.stripe_payment_intent_id || null,
        details: {
          reason: "payment succeeded but booking status/payment_status not aligned",
          paymentStatus,
          bookingStatus,
          bookingPaymentStatus,
        },
      });
    }

    if (!paymentSucceeded && bookingMarkedPaid) {
      findings.push({
        anomalyType: ANOMALY_TYPES.BOOKING_WITHOUT_SUCCESSFUL_PAYMENT,
        bookingId: row.booking_id,
        paymentId: row.payment_id,
        stripePaymentIntent: row.stripe_payment_intent_id || null,
        details: {
          reason: "booking marked paid but payment not successful",
          paymentStatus,
          bookingStatus,
          bookingPaymentStatus,
        },
      });
    }
  }

  return findings;
}

async function verifyStripePaymentIntentForRow(row = {}) {
  if (!STRIPE_VERIFY_ENABLED || !stripe) {
    return {
      verified: false,
      skipped: true,
      reason: "stripe_verification_disabled_or_unavailable",
    };
  }

  if (!row.stripe_payment_intent_id) {
    return {
      verified: false,
      skipped: true,
      reason: "missing_stripe_payment_intent_id",
    };
  }

  const dbAmountMinor = Math.round(toFiniteNumber(row.payment_amount, 0) * 100);
  const dbStatus = normalizeStatus(row.payment_status);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STRIPE_VERIFY_TIMEOUT_MS);

  try {
    const intent = await stripe.paymentIntents.retrieve(row.stripe_payment_intent_id, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const stripeStatus = normalizeStatus(intent.status);
    const stripeAmountMinor = toFiniteNumber(intent.amount, 0);

    const statusConflict =
      (DB_SUCCESS_STATUSES.has(dbStatus) && !STRIPE_SUCCESS_STATUSES.has(stripeStatus)) ||
      (!DB_SUCCESS_STATUSES.has(dbStatus) && STRIPE_SUCCESS_STATUSES.has(stripeStatus));

    const amountConflict = Math.abs(dbAmountMinor - stripeAmountMinor) > 1;

    return {
      verified: true,
      skipped: false,
      stripeStatus,
      stripeAmountMinor,
      statusConflict,
      amountConflict,
      requestId: intent?.lastResponse?.requestId || null,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    logger.warn("reconciliation_stripe_verify_failed", {
      event: "reconciliation_stripe_verify_failed",
      paymentId: row.payment_id,
      stripePaymentIntent: row.stripe_payment_intent_id,
      message: error.message,
      type: error.type || null,
    });

    return {
      verified: false,
      skipped: true,
      reason: "stripe_unavailable_or_timeout",
      errorType: error.type || null,
    };
  }
}

async function recordReconciliationFinding(finding = {}) {
  const runId = String(finding.runId || "");
  const anomalyType = String(finding.anomalyType || "").slice(0, 64);
  const severity = ["low", "high", "critical"].includes(finding.severity)
    ? finding.severity
    : classifyAnomaly(finding);

  if (!runId || !anomalyType) {
    return null;
  }

  const bookingId = Number.isFinite(Number(finding.bookingId)) ? Number(finding.bookingId) : null;
  const paymentId = Number.isFinite(Number(finding.paymentId)) ? Number(finding.paymentId) : null;
  const stripePaymentIntent = finding.stripePaymentIntent ? String(finding.stripePaymentIntent) : null;

  try {
    const result = await query(
      `
        INSERT INTO payment_reconciliation_reports (
          run_id,
          booking_id,
          payment_id,
          stripe_payment_intent,
          anomaly_type,
          severity,
          details_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          details_json = VALUES(details_json),
          created_at = CURRENT_TIMESTAMP
      `,
      [
        runId,
        bookingId,
        paymentId,
        stripePaymentIntent,
        anomalyType,
        severity,
        JSON.stringify(finding.details || {}),
      ]
    );

    logger.info("reconciliation_finding_recorded", {
      event: "reconciliation_finding_recorded",
      runId,
      anomalyType,
      severity,
      bookingId,
      paymentId,
      reportId: result.insertId || null,
    });

    return result.insertId || null;
  } catch (error) {
    logger.error("reconciliation_finding_record_failed", {
      event: "reconciliation_finding_record_failed",
      runId,
      anomalyType,
      message: error.message,
    });
    return null;
  }
}

async function sendAnomalyAlert(finding) {
  const payload = {
    event: "payment_reconciliation_anomaly",
    title: `Reconciliation anomaly: ${finding.anomalyType}`,
    message: finding.details?.reason || "Payment reconciliation anomaly detected",
    details: {
      runId: finding.runId,
      anomalyType: finding.anomalyType,
      severity: finding.severity,
      bookingId: finding.bookingId || null,
      paymentId: finding.paymentId || null,
      stripePaymentIntent: finding.stripePaymentIntent || null,
      ...finding.details,
    },
  };

  if (finding.severity === "critical") {
    return sendCriticalAlert(payload);
  }

  if (finding.severity === "high") {
    return sendHighAlert(payload);
  }

  return false;
}

async function findDuplicateIntents(lookbackHours = RECON_LOOKBACK_HOURS) {
  const rows = await query(
    `
      SELECT
        stripe_payment_intent_id,
        COUNT(*) AS duplicate_count,
        MIN(id) AS min_payment_id,
        MAX(id) AS max_payment_id
      FROM payments
      WHERE stripe_payment_intent_id IS NOT NULL
        AND stripe_payment_intent_id <> ''
        AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR)
      GROUP BY stripe_payment_intent_id
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
      LIMIT 1000
    `,
    [Math.max(1, Number(lookbackHours) || RECON_LOOKBACK_HOURS)]
  );

  return rows;
}

async function runReconciliationBatch(options = {}) {
  const runId = options.runId || generateRunId();
  const batchSize = Math.max(20, Math.min(1000, Number(options.batchSize) || DEFAULT_BATCH_SIZE));
  const lookbackHours = Math.max(1, Number(options.lookbackHours) || RECON_LOOKBACK_HOURS);

  let lastPaymentId = 0;
  let processedRows = 0;
  let anomalyCount = 0;
  let stripeChecks = 0;

  const startedAt = Date.now();

  logger.info("reconciliation_run_started", {
    event: "reconciliation_run_started",
    runId,
    batchSize,
    lookbackHours,
    stripeVerificationEnabled: STRIPE_VERIFY_ENABLED && !!stripe,
  });

  while (true) {
    const rows = await query(
      `
        SELECT
          p.id AS payment_id,
          p.booking_id,
          p.stripe_payment_intent_id,
          p.amount AS payment_amount,
          p.status AS payment_status,
          p.created_at AS payment_created_at,
          b.status AS booking_status,
          b.payment_status AS booking_payment_status,
          b.total_price AS booking_total_price,
          b.payment_intent_id AS booking_payment_intent_id,
          b.updated_at AS booking_updated_at
        FROM payments p
        LEFT JOIN bookings b ON b.id = p.booking_id
        WHERE p.id > ?
          AND p.created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR)
        ORDER BY p.id ASC
        LIMIT ?
      `,
      [lastPaymentId, lookbackHours, batchSize]
    );

    if (!rows.length) {
      break;
    }

    for (const row of rows) {
      processedRows += 1;
      lastPaymentId = Number(row.payment_id);

      const findings = checkPaymentConsistency(row);

      if (STRIPE_VERIFY_ENABLED && stripe && stripeChecks < STRIPE_VERIFY_LIMIT_PER_RUN) {
        stripeChecks += 1;
        const stripeVerification = await verifyStripePaymentIntentForRow(row);

        if (stripeVerification.verified && stripeVerification.statusConflict) {
          findings.push({
            anomalyType: ANOMALY_TYPES.STATUS_MISMATCH,
            bookingId: row.booking_id,
            paymentId: row.payment_id,
            stripePaymentIntent: row.stripe_payment_intent_id || null,
            details: {
              reason: "stripe/db payment status mismatch",
              dbStatus: normalizeStatus(row.payment_status),
              stripeStatus: stripeVerification.stripeStatus,
              stripeRequestId: stripeVerification.requestId,
            },
          });
        }

        if (stripeVerification.verified && stripeVerification.amountConflict) {
          findings.push({
            anomalyType: ANOMALY_TYPES.AMOUNT_MISMATCH,
            bookingId: row.booking_id,
            paymentId: row.payment_id,
            stripePaymentIntent: row.stripe_payment_intent_id || null,
            details: {
              reason: "stripe/db amount mismatch",
              dbAmountMinor: Math.round(toFiniteNumber(row.payment_amount, 0) * 100),
              stripeAmountMinor: stripeVerification.stripeAmountMinor,
              stripeRequestId: stripeVerification.requestId,
            },
          });
        }

        if (STRIPE_VERIFY_PAUSE_MS > 0) {
          await sleep(STRIPE_VERIFY_PAUSE_MS);
        }
      }

      for (const finding of findings) {
        const enrichedFinding = {
          ...finding,
          runId,
          severity: classifyAnomaly(finding),
        };

        await recordReconciliationFinding(enrichedFinding);
        anomalyCount += 1;

        if (enrichedFinding.severity === "critical" || enrichedFinding.severity === "high") {
          Promise.resolve(sendAnomalyAlert(enrichedFinding)).catch(() => {});
        }
      }
    }
  }

  const duplicateIntentRows = await findDuplicateIntents(lookbackHours);
  for (const duplicate of duplicateIntentRows) {
    const finding = {
      runId,
      anomalyType: ANOMALY_TYPES.DUPLICATE_INTENT,
      severity: classifyAnomaly({ anomalyType: ANOMALY_TYPES.DUPLICATE_INTENT }),
      bookingId: null,
      paymentId: null,
      stripePaymentIntent: duplicate.stripe_payment_intent_id,
      details: {
        reason: "multiple payment rows share same stripe_payment_intent_id",
        duplicateCount: Number(duplicate.duplicate_count),
        minPaymentId: Number(duplicate.min_payment_id),
        maxPaymentId: Number(duplicate.max_payment_id),
      },
    };

    await recordReconciliationFinding(finding);
    anomalyCount += 1;
    Promise.resolve(sendAnomalyAlert(finding)).catch(() => {});
  }

  const bookingGaps = await query(
    `
      SELECT
        b.id AS booking_id,
        b.status AS booking_status,
        b.payment_status AS booking_payment_status,
        b.payment_intent_id AS stripe_payment_intent_id,
        b.total_price AS booking_total_price
      FROM bookings b
      LEFT JOIN payments p
        ON p.booking_id = b.id
        AND p.status IN ('succeeded', 'paid')
      WHERE b.created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR)
        AND b.payment_status = 'paid'
        AND p.id IS NULL
      ORDER BY b.id ASC
      LIMIT 5000
    `,
    [lookbackHours]
  );

  for (const gap of bookingGaps) {
    const finding = {
      runId,
      anomalyType: ANOMALY_TYPES.BOOKING_WITHOUT_SUCCESSFUL_PAYMENT,
      severity: classifyAnomaly({ anomalyType: ANOMALY_TYPES.BOOKING_WITHOUT_SUCCESSFUL_PAYMENT }),
      bookingId: gap.booking_id,
      paymentId: null,
      stripePaymentIntent: gap.stripe_payment_intent_id || null,
      details: {
        reason: "booking marked paid but no successful payment row found",
        bookingStatus: normalizeStatus(gap.booking_status),
        bookingPaymentStatus: normalizeStatus(gap.booking_payment_status),
        bookingAmount: toFiniteNumber(gap.booking_total_price, 0),
      },
    };

    await recordReconciliationFinding(finding);
    anomalyCount += 1;
    Promise.resolve(sendAnomalyAlert(finding)).catch(() => {});
  }

  const durationMs = Date.now() - startedAt;

  logger.info("reconciliation_run_completed", {
    event: "reconciliation_run_completed",
    runId,
    processedRows,
    anomalyCount,
    stripeChecks,
    durationMs,
  });

  return {
    runId,
    processedRows,
    anomalyCount,
    stripeChecks,
    durationMs,
    completedAt: new Date().toISOString(),
  };
}

module.exports = {
  ANOMALY_TYPES,
  runReconciliationBatch,
  checkPaymentConsistency,
  classifyAnomaly,
  recordReconciliationFinding,
  generateRunId,
  verifyStripePaymentIntentForRow,
};
