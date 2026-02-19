# MaleBangkok Production SLO & Error Budget Framework

**Version:** 1.0  
**Date:** 2026-02-19  
**Owner:** SRE / Product Engineering  
**Platform:** MaleBangkok Luxury Marketplace  
**Scope:** Node.js API + Payment Integration + Booking System

---

## PART 1 — Service Level Indicators (SLIs)

### Definition & Measurement Approach

| SLI | Definition | Measurement Method | Data Source | Example Query / Instrumentation |
|-----|-----------|-------------------|------------|----------------------------------|
| **API Availability (%)** | Fraction of successful API `GET /api/guides` and `GET /api/health` requests over 5-minute windows. 5xx, timeouts, and connection errors count as failures. | Count successful (2xx/3xx) vs failed (4xx/5xx/timeout) requests per window. | Application logs (winston), load balancer if available. | `grep -c '"statusCode":200' access.log` / `grep -c '"statusCode":[45][0-9][0-9]' access.log` over 5-min window. SQL: `SELECT (SUM(CASE WHEN status_code < 400 THEN 1 ELSE 0 END) / COUNT(*)) * 100 FROM request_log WHERE window_start >= NOW() - INTERVAL 5 MINUTE;` |
| **API Latency p95 (ms)** | 95th percentile of request response time (excluding 5xx responses). Measured for critical paths: auth, booking search, payment intent creation. | Measure `responseTime` from request logger middleware on per-endpoint basis. | Access logs with timestamp + responseTime field. | `awk '{print $NF}' access.log \| tail -n 1000 \| sort -n \| head -c 950` for p95 estimate. SQL: `SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) FROM request_log WHERE path IN ('/api/guides', '/api/bookings', '/api/payments/intent') AND status_code < 500;` |
| **Booking Success Rate (%)** | Fraction of booking requests that reach "pending" state without error. 4xx client errors (slot unavailable, invalid data) do NOT count against this; only server errors and timeouts count as failures. | Track: (successful POST /api/bookings with 201 response) / (all POST /api/bookings requests) by 5-minute window. | Application logs with `booking_created_atomic` or `create_booking_handler` events. | `grep -c '"event":"booking_created_atomic"' application.log` / `grep -c '"path":"/api/bookings".*"method":"POST"' access.log` per window. |
| **Payment Success Rate (%)** | Fraction of payment intent creations that complete without unrecoverable server errors. Does NOT include declined cards (legitimate; customer error) or 3DS auth challenges. Counts only: (successful POST /api/payments/intent) / (all POST /api/payments/intent). | Track payment intents reaching "succeeded" state within 30 seconds of creation request returning 201. | Application logs with `payment_intent_ready` or webhook `payment_intent.succeeded` events. | `grep -c '"paymentIntentId"' application.log` and cross-check with Stripe dashboard for duplicate/failed intents. |
| **Webhook Processing Success (%)** | Fraction of Stripe webhook delivery re-attempts (initial + retries) that result in permanent success (idempotent side effects applied exactly once). Count webhook events processed successfully / webhook events received from Stripe. Exclude webhook events rejected by signature validation (security; not service failure). | Track `stripe_webhook_handler` success/failure + dedup/replay behavior. | Application logs tagged with `event: "webhook_processing_failed"` or successful state transitions. | `(grep -c '"statusCode":200' access.log \| grep webhook) / (grep -c 'stripe-signature' access.log)`. SQL: `SELECT (SUM(CASE WHEN webhook_status='succeeded' THEN 1 ELSE 0 END) / COUNT(*)) * 100 FROM webhook_log WHERE event_source='stripe';` |
| **Matching Response Time p95 (ms)** | 95th percentile response time for guide search + matching algorithm response (GET /api/guides with filters). Measured end-to-end from request receipt to response sent. | Measure `responseTime` field in access logs for `/api/guides` endpoint. Exclude 5xx responses. | Access logs with responseTime and path. | `awk '/\/api\/guides/ && $statusCode < 500 {print $responseTime}' access.log \| sort -n \| awk 'NR==int(NR*0.95) {print}'` |

### SLI Notes

- **Exclusions from SLI**:
  - Client errors (4xx) that are not server-caused (e.g. `409 Conflict` from slot race is counted as success; `400 Bad Request` for malformed JSON is user error, not service failure).
  - Maintenance windows (planned; must be announced in advance).
  - External dependency cascades (Stripe API down; we measured our side; note it separately as context).

- **Measurement granularity**: 5-minute windows for real-time alerts; daily/monthly aggregates for reporting.

- **Data retention**: Keep granular logs for 30 days; aggregate metrics for 1 year.

---

## PART 2 — Production SLO Targets

### Monthly SLO Table

| SLI | Target | Rationale | Yellow (Warning) | Red (Critical) |
|-----|--------|-----------|-----------------|----------------|
| API Availability | **99.5%** | Luxury marketplace allows brief degradation (user can retry); 99.9% is costly and not required for checkout flow tolerance. Down ~3.6 hours/month acceptable. | 99.2% (cumulative over week) | 98.5% (cumulative over 24h) |
| API Latency p95 | **1500 ms** | Critical paths (booking, payment) under 1.5s acceptable for manual interaction; GCP/AWS async patterns handle retry. | 2000 ms sustained >10 min | 3000 ms sustained >5 min |
| Booking Success Rate | **99.0%** | Excludes legitimate 409 conflicts (slot taken race). 99% means max 1% unintended failures; ~7 failed bookings per 700 attempts/month. | 97.5% cumulative over day | 95% cumulative over 4h |
| Payment Success Rate | **99.5%** | High; payment is revenue-critical. Excludes card declined/3DS auth (client responsibility). Idempotency + webhook safety critical. | 99% cumulative over day | 98% cumulative over 4h |
| Webhook Processing Success | **99.9%** | Stripe event replay + dedup must be rock-solid. Any missed became unreconciled payments. | 99.5% cumulative over day | 99% cumulative over 6h |
| Matching Response Time p95 | **1000 ms** | Guide search must feel snappy for UX; mobile users benefit from <1s. | 1200 ms sustained >15 min | 1500 ms sustained >10 min |

### Justification

- **99.5% API availability**: Production luxury platforms routinely target 99.5–99.9; 99.5 is a good starting point. Allows brief incident without emergency escalation.
- **1500 ms latency p95**: Matches browser UX timeout (2s); some requests naturally slower (search with filters, matching algorithm); p95 is forgiving.
- **99.0% booking success**: Hard targets like 99.5% often fail due to race conditions inherent in distributed systems; 99.0% is realistic with atomic locking.
- **99.5% payment success**: Payment system must be reliable; Stripe handles most failures (declined cards, 3DS); our 99.5% is for idempotency + webhook safety.
- **99.9% webhook**: Must be higher than payment because webhook is recovery path for payment state drift; any miss is customer-facing refund/rebook.

### Monthly Error Budget

Example calculation (API Availability):

```
Monthly SLO Target: 99.5%
Days per month: 30
Minutes per day: 24 * 60 = 1440
Total minutes: 30 * 1440 = 43,200

Allowed downtime: (100 - 99.5) / 100 = 0.5% of 43,200 = 216 minutes (~3.6 hours)
```

---

## PART 3 — Error Budget Model

### Concept

Error budget = the amount of failure that is acceptable without violating the SLO commitment.

**Formula:**

```
Error Budget % = 100 - SLO Target %
Error Budget Minutes (monthly) = (Error Budget % / 100) * Total Minutes in Month
```

### Burn Rate

Burn rate is the speed at which you consume your error budget.

**Definition:**

```
Burn Rate = Observed Failure Rate / Error Budget %

Burn Rate = 1.0: consuming error budget at expected pace (SLO at boundary).
Burn Rate > 1.0: consuming budget faster than allowed; alert needed soon.
Burn Rate >> 1.0: critical breach; stop releases immediately.
```

### Fast Burn vs Slow Burn

**Fast Burn** (alert within minutes):
- Error rate becomes 10–100x the error budget burn rate.
- Example: if error budget allows 0.5% failures, fast burn is >5% error rate.
- Action: page on-call immediately.

**Slow Burn** (alert within hours):
- Error rate sustainable but exceeding SLO; will exhaust budget in days.
- Example: if error budget allows 0.5% failures, slow burn is 0.5–1.5% error rate.
- Action: investigate within business hours; decide on freeze or mitigation.

### Worked Example (API Availability)

**Setup:**
- SLO Target: 99.5%
- Measurement Window: 1 month (43,200 minutes)
- Error Budget: 0.5% = 216 minutes

**Scenario 1: Fast burn detection**

```
Observed failure rate: 5% for 5 minutes
Error budget burn: 5% / 0.5% = 10x
Projected monthly exhaustion: 43,200 / 10 = 4,320 minutes (3 days)
Action: Page on-call. This is critical.
Alert: "API Availability fast burn (10x) detected; will exhaust budget in 3 days if sustained."
```

**Scenario 2: Slow burn detection**

```
Observed failure rate: 0.8% sustained over 1 hour
Error budget burn: 0.8% / 0.5% = 1.6x
Projected monthly exhaustion: 43,200 / 1.6 = 27,000 minutes (~18.75 days)
Action: Alert team; start investigation in next business day. Consider release freeze.
Alert: "API Availability slow burn (1.6x) detected; will exhaust budget in ~19 days."
```

**Scenario 3: Within budget**

```
Observed failure rate: 0.3% over 1 hour
Error budget: 0.5%
Burn rate: 0.3% / 0.5% = 0.6x
Action: No action. Service is outperforming SLO.
```

### What Counts Against Budget

- **Counts**: 5xx server errors, timeouts (no response in 30s), connection resets, unhandled exceptions.
- **Does NOT count**: 4xx client errors (validation, 409 from legitimate races), 429 (rate limit on user; we're protecting ourselves), maintenance windows, external dependency failures (Stripe API down; note as context but don't penalize).

---

## PART 4 — Alert Policies Based on Error Budget

### Alert Thresholds by Burn Rate

| Burn Rate Threshold | Window | SLI Example (API Avail) | Severity | Action | Alert Name |
|-------------------|--------|------------------------|-----------|---------|----|
| **Fast burn >= 5x** | 5 min | Error rate >= 2.5% (5 * 0.5% budget) | **CRITICAL** | Page on-call instantly; declare incident. Roll back last deploy. | `slo_fast_burn_critical` |
| **Fast burn 2–5x** | 15 min | Error rate >= 1.0–2.5% | **HIGH** | Alert team; start incident; consider rollback. Freeze non-emergency deploys. | `slo_fast_burn_high` |
| **Slow burn 1.0–2.0x** | 1 hour | Error rate >= 0.5–1.0% | **MEDIUM** | Notify on-call; investigate; plan mitigation. Do not deploy risky features. | `slo_slow_burn_medium` |
| **Slow burn 0.5–1.0x** | 4 hours | Error rate >= 0.25–0.5% | **LOW** | Informational; track in weekly SRE review. Can proceed with normal release process. | `slo_slow_burn_low` |

### Burn Rate Calculation (Operational)

**For 5-minute windows:**

```
Burn Rate = (Observed failure count in 5 min) / (Expected failures in 5 min under SLO)

Expected failures in 5 min under SLO for 99.5% availability:
  = (0.5% / 100%) * 43,200 min / (43,200 / 5) = 1 failure per 200 windows
  
If observed over 5 min: 0.5 failures/window (0.005 failure rate per request is typical)
```

**Simplified for monitoring:**

For API Availability SLO of 99.5%:
- Fast burn CRITICAL: cumulative 5xx rate > 2.5% in 5-min window
- Fast burn HIGH: cumulative 5xx rate > 1.0% in 15-min window
- Slow burn: cumulative 5xx rate > 0.5% in 1-hour window

### Specific Alert Policies

#### Critical Alerts (Page On-Call)

**Payment Failure Spike**
- Trigger: Payment success rate < 95% in 5-min window.
- Window: 5 minutes.
- Action: Page on-call; check Stripe dashboard for auth/network issues; prepare rollback of payment service.
- Example: `sendCriticalAlert({ event: "payment_success_rate_drop", threshold: 0.95, observed: 0.87 })`

**Booking Failure Spike**
- Trigger: Booking success rate < 90% in 5-min window (excluding 409 legitimate conflicts).
- Window: 5 minutes.
- Action: Page on-call; check DB locks/deadlocks; prepare rollback of booking service.

**API Availability Fast Burn**
- Trigger: 5xx rate > 2.5% (5-minute window) or sustained >1.5% (15-minute window).
- Window: 5 minutes for >= 2.5%; 15 minutes for >= 1.5%.
- Action: Page on-call; declare incident; assess rollback vs rapid fix.

#### Warning Alerts (Notify On-Call, Team Slack)

**Latency Degradation**
- Trigger: p95 latency > 2.0s (from baseline 1.5s target) sustained for 15 minutes.
- Window: 15 minutes.
- Action: Heuristic check; correlate with spike in load, GC, or lock contention.
- Do not override budget decision; wait for incident decision.

**Slow Burn Detection**
- Trigger: Burn rate 1.0–2.0x sustained for 1 hour.
- Window: 1 hour rolling.
- Action: Email on-call; plan investigation next business day. Freeze experimental feature deployments (allow only critical hotfixes).

**Webhook Processing Failures**
- Trigger: Webhook success rate < 99.5% in 1-hour window.
- Window: 1 hour.
- Action: Alert operations team; check Slack webhook endpoint in alert service; verify Stripe signature validation is not over-rejecting.

---

## PART 5 — Dashboard Design

### Minimum Viable SLO Dashboard

**Layout** (single page, refresh every 60 seconds):

```
┌─────────────────────────────────────────────────────────────────┐
│ MaleBangkok Production SLO Dashboard                      [LIVE] │
│ Last updated: 2026-02-19 14:23:45 UTC                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────┬──────────────────────────────────────┐
│ AVAILABILITY             │ LATENCY (p95)                        │
│ Current: 99.8% ✓         │ Current: 1240ms ✓                   │
│ Target:  99.5%           │ Target:  1500ms                      │
│ Budget:  216 min/month   │ 7-day:   ▂▃▄▄▅▆▆ (trend: stable)  │
│ Spent:   45 min (21%)    │ Yellow:  2000ms  Red: 3000ms        │
│                          │                                      │
│ ███████████░░░░░░░░░░░░  │ ███████████████░░░░░░░░░░░░░░░░░░  │
│ (45/216 min consumed)    │ 1240 of 1500ms used                 │
└──────────────────────────┴──────────────────────────────────────┘

┌──────────────────────────┬──────────────────────────────────────┐
│ BOOKING SUCCESS RATE     │ PAYMENT SUCCESS RATE                 │
│ Current: 99.2% ✓         │ Current: 99.8% ✓                   │
│ Target:  99.0%           │ Target:  99.5%                       │
│ 24h:     99.1% (9 fail)  │ 24h:     99.7% (3 fail)             │
│ 7d:      98.8% (112 fail)│ 7d:      99.4% (42 fail)            │
│                          │                                      │
│ ███████████████░░░░░░░░  │ ███████████████░░░░░░░░░░░░░░░░░░  │
│ (99.2% of 1000 bookings) │ (99.8% of 500 payments)             │
└──────────────────────────┴──────────────────────────────────────┘

┌──────────────────────────┬──────────────────────────────────────┐
│ WEBHOOK SUCCESS RATE     │ MATCHING RESPONSE TIME p95           │
│ Current: 99.95% ✓        │ Current: 892ms ✓                    │
│ Target:  99.9%           │ Target:  1000ms                      │
│ 24h:     99.92% (0.5 fail)│ 7-day:   ▂▃▃▄▄▅▄ (trend: stable)  │
│ Events:  2104 processed  │ Yellow:  1200ms  Red: 1500ms        │
│                          │                                      │
│ ███████████████░░░░░░░░  │ █████████░░░░░░░░░░░░░░░░░░░░░░░░  │
│ (0.1% budget margin)     │ (892 of 1000ms target)              │
└──────────────────────────┴──────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ ERROR BUDGET BURN RATE (all SLIs)                                │
│                                                                   │
│ Availability:   0.6x (within budget)      ─────────────────────  │
│ Latency p95:    0.8x (within budget)      ─────────────────────  │
│ Booking:        0.9x (within budget)      ─────────────────────  │
│ Payment:        0.5x (excellent)          ─────────────────────  │
│ Webhook:        0.1x (excellent)          ─────────────────────  │
│ Matching:       0.9x (within budget)      ─────────────────────  │
│                                                                   │
│ Overall Burn: 0.7x / month (all SLOs on track)                 │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ ALERTS & INCIDENTS (Last 7 Days)                                 │
│                                                                   │
│ [2026-02-19 06:30] HIGH: Latency spike (p95: 2100ms, 22 min)   │
│   Root: DB query (guide search) not using index. Fixed.          │
│   Budget consumed: +5 min availability due to 0.2% error rate.   │
│                                                                   │
│ [2026-02-17 14:15] MEDIUM: Slow burn detected over 4 hours.    │
│   Root: Booking race condition spikes (slot popularity).         │
│   Mitigation: No action needed; within monthly budget.           │
│                                                                   │
│ [No incidents in last 24 hours]                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Widget Definitions

- **Availability** (top-left): green if >= target; yellow if 99.0–99.5%; red if < 99.0%.
- **Latency p95** (top-right): green if <= target; yellow if target–2000ms; red if > 2000ms.
- **Booking/Payment/Webhook**: percent bars with 24h and 7d rolling averages.
- **Burn Rate**: show only if > 0.5x; "on track" if <= 1.0x; "warning" if 1.0–2.0x; "critical" if > 2.0x.
- **Incidents**: list of last 7 days with brief root cause + budget impact.

### Update Frequency

- Store metrics in time-series DB (or aggregate from logs).
- Refresh dashboard every 60 seconds for real-time visibility.
- Calculate rolling 5-min, 1-hour, 1-day, 7-day, and 30-day aggregates.
- Retain granular 5-min data for 30 days; aggregate for 1 year.

### Red/Amber/Green Logic

```
Availability:
  Green:  >= 99.5% monthly target (or 99.0% for fast windows)
  Amber:  99.0–99.5%
  Red:    < 99.0%

Latency p95:
  Green:  <= 1500ms
  Amber:  1500–2000ms
  Red:    > 2000ms

Booking Success:
  Green:  >= 99.0%
  Amber:  98.0–99.0%
  Red:    < 98.0%

Payment Success:
  Green:  >= 99.5%
  Amber:  99.0–99.5%
  Red:    < 99.0%

Burn Rate (all SLIs):
  Green:  <= 1.0x (within SLO pace)
  Amber:  1.0–2.0x (warn; investigate)
  Red:    > 2.0x (critical; incident)
```

---

## PART 6 — Implementation Hooks (Code-Level)

### 1. Request Timing Middleware

Track request latency per endpoint. Add to [backend/middleware/requestLogger.js](backend/middleware/requestLogger.js):

```javascript
const { v4: uuidv4 } = require("uuid");
const logger = require("../config/logger");

function requestLogger(req, res, next) {
  req.requestId = uuidv4();
  res.setHeader("X-Request-Id", req.requestId);

  const startedAt = process.hrtime.bigint();
  const startedAtMs = Date.now();

  res.on("finish", () => {
    const elapsedNanoseconds = process.hrtime.bigint() - startedAt;
    const responseTimeMs = Number(elapsedNanoseconds / 1000000n);

    // SLI metric: latency
    const isCriticalPath = ["/api/guides", "/api/bookings", "/api/payments/intent"].includes(
      req.path
    );

    logger.info("http_request_completed", {
      event: "http_request_completed",
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTimeMs,
      isCriticalPath,
      timestamp: startedAtMs,
      // SLI: latency tracking
      sli: {
        latency_ms: responseTimeMs,
        success: res.statusCode < 500,
      },
    });
  });

  next();
}

module.exports = {
  requestLogger,
};
```

### 2. Booking Success Metric

Track in [backend/controllers/bookingController.js](backend/controllers/bookingController.js):

```javascript
async function createBookingHandler(req, res, next) {
  const startTime = Date.now();
  try {
    // ... booking creation logic ...

    logger.info("booking_created_atomic", {
      event: "booking_created_atomic",
      bookingId,
      guideId: normalizedGuideId,
      userId: req.user?.id,
      status: "pending",
      // SLI metric: booking success
      sli: {
        metric: "booking_success",
        value: 1,
        timestamp: startTime,
      },
    });

    return res.status(201).json({ /* response */ });
  } catch (error) {
    // Log failure; don't count 409 (legitimate conflict) as SLI failure
    if (error.statusCode === 409) {
      logger.warn("booking_conflict_not_sli_failure", {
        event: "booking_conflict_not_sli_failure",
        reason: "Legitimate race condition (slot taken)",
        userId: req.user?.id,
        guideId: req.body.guideId,
      });
      // Return 409; don't penalize SLI
      return res.status(409).json({ message: "Slot unavailable" });
    }

    // Server error: counts as SLI failure
    logger.error("booking_creation_failed", {
      event: "booking_creation_failed",
      message: error.message,
      userId: req.user?.id,
      // SLI metric: booking failure
      sli: {
        metric: "booking_success",
        value: 0,
        timestamp: startTime,
      },
    });
    return next(error);
  }
}
```

### 3. Payment Success Metric

Track in [backend/controllers/paymentController.js](backend/controllers/paymentController.js):

```javascript
async function createPaymentIntentHandler(req, res, next) {
  const startTime = Date.now();
  try {
    // ... payment intent creation ...

    logger.info("payment_intent_ready", {
      event: "payment_intent_ready",
      bookingId: booking.id,
      userId: req.user?.id,
      paymentIntentId: paymentIntentState.paymentIntentId,
      reused: paymentIntentState.reused,
      // SLI metric: payment success
      sli: {
        metric: "payment_success",
        value: 1,
        timestamp: startTime,
      },
    });

    return res.status(201).json({ /* response */ });
  } catch (error) {
    logger.error("payment_intent_creation_failed", {
      event: "payment_intent_creation_failed",
      message: error.message,
      bookingId: req.body.bookingId,
      userId: req.user?.id,
      // SLI metric: payment failure (unrecoverable)
      sli: {
        metric: "payment_success",
        value: 0,
        timestamp: startTime,
      },
    });
    return next(error);
  }
}

// Webhook success tracking
async function stripeWebhookHandler(req, res, next) {
  const startTime = Date.now();
  try {
    // ... webhook processing ...
    logger.info("stripe_webhook_success", {
      event: "stripe_webhook_success",
      eventType: event.type,
      paymentIntentId: event.data.object.id,
      // SLI metric: webhook processing success
      sli: {
        metric: "webhook_success",
        value: 1,
        timestamp: startTime,
      },
    });
    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error("stripe_webhook_processing_failed", {
      event: "stripe_webhook_processing_failed",
      message: error.message,
      // SLI metric: webhook failure
      sli: {
        metric: "webhook_success",
        value: 0,
        timestamp: startTime,
      },
    });
    return next(error);
  }
}
```

### 4. SLI Aggregation Job (Optional; Cron)

Create [backend/jobs/sliAggregation.js](backend/jobs/sliAggregation.js):

```javascript
const logger = require("../config/logger");
const { query } = require("../config/db");

async function aggregateSLIMetrics() {
  try {
    // Parse logs and compute SLI metrics every 5 minutes
    // This is a lightweight background job (non-blocking)
    
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Example: count booking successes in last 5 minutes
    // In production, use structured log aggregation (Loki, ELK, or Better Stack)
    
    logger.debug("sli_aggregation_running", {
      event: "sli_aggregation_running",
      windowStart: fiveMinutesAgo,
      windowEnd: now,
    });

    // Pseudo-code (actual implementation depends on log storage):
    // const bookingMetrics = await getMetricsFromLogs("booking_success", fiveMinutesAgo, now);
    // const paymentMetrics = await getMetricsFromLogs("payment_success", fiveMinutesAgo, now);
    // const webhookMetrics = await getMetricsFromLogs("webhook_success", fiveMinutesAgo, now);
    //
    // Store in metrics table or push to monitoring system
  } catch (error) {
    logger.error("sli_aggregation_failed", {
      event: "sli_aggregation_failed",
      message: error.message,
    });
  }
}

// Run every 5 minutes
setInterval(aggregateSLIMetrics, 5 * 60 * 1000);

module.exports = {
  aggregateSLIMetrics,
};
```

### 5. Burn Rate Alert Helper

Add to [backend/services/alertService.js](backend/services/alertService.js):

```javascript
function calculateBurnRate(observedFailureRate, sloErrorBudgetPercent) {
  if (sloErrorBudgetPercent === 0) return 0;
  return observedFailureRate / sloErrorBudgetPercent;
}

async function checkSLOBurnRate(sliName, observedFailureRate, sloTarget) {
  const errorBudgetPercent = 100 - sloTarget;
  const burnRate = calculateBurnRate(observedFailureRate, errorBudgetPercent);

  const isFastBurn = burnRate >= 5.0;
  const isSlowBurn = burnRate >= 1.0 && burnRate < 5.0;

  if (isFastBurn) {
    return sendCriticalAlert({
      event: "slo_fast_burn_alert",
      title: `SLO fast burn detected: ${sliName}`,
      message: `Burn rate ${burnRate.toFixed(1)}x; will exhaust budget in ${Math.round(720 / burnRate)} hours`,
      path: sliName,
      details: {
        sliName,
        observedFailureRate: (observedFailureRate * 100).toFixed(2) + "%",
        sloTarget: sloTarget + "%",
        burnRate: burnRate.toFixed(2) + "x",
      },
    });
  }

  if (isSlowBurn) {
    return sendHighAlert({
      event: "slo_slow_burn_alert",
      title: `SLO slow burn detected: ${sliName}`,
      message: `Burn rate ${burnRate.toFixed(1)}x; will exhaust budget in ${Math.round(720 / burnRate)} hours`,
      path: sliName,
      details: {
        sliName,
        observedFailureRate: (observedFailureRate * 100).toFixed(2) + "%",
        sloTarget: sloTarget + "%",
        burnRate: burnRate.toFixed(2) + "x",
      },
    });
  }

  return false;
}

module.exports = {
  calculateBurnRate,
  checkSLOBurnRate,
  // ... existing exports
};
```

### 6. Example Log Query for Metrics Extraction

Add to [backend/utils/metrics.js](backend/utils/metrics.js):

```javascript
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Extract SLI metrics from logs (lightweight; for production, use dedicated log aggregation)
async function extractSLIMetricsFromLogs(logFilePath, startTime, endTime) {
  const metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    bookingAttempts: 0,
    bookingSuccesses: 0,
    paymentAttempts: 0,
    paymentSuccesses: 0,
    webhookAttempts: 0,
    webhookSuccesses: 0,
    latencies: [],
  };

  const fileStream = fs.createReadStream(logFilePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    try {
      const logEntry = JSON.parse(line);
      const logTime = new Date(logEntry.timestamp);

      if (logTime < startTime || logTime > endTime) {
        continue;
      }

      // Track request metrics
      if (logEntry.event === "http_request_completed") {
        metrics.totalRequests += 1;
        if (logEntry.statusCode < 500) {
          metrics.successfulRequests += 1;
        } else {
          metrics.failedRequests += 1;
        }
        if (logEntry.responseTimeMs) {
          metrics.latencies.push(logEntry.responseTimeMs);
        }
      }

      // Track booking metrics
      if (logEntry.event === "booking_created_atomic") {
        metrics.bookingSuccesses += 1;
        metrics.bookingAttempts += 1;
      }
      if (logEntry.event === "booking_creation_failed") {
        metrics.bookingAttempts += 1;
      }

      // Track payment metrics
      if (logEntry.event === "payment_intent_ready") {
        metrics.paymentSuccesses += 1;
        metrics.paymentAttempts += 1;
      }
      if (logEntry.event === "payment_intent_creation_failed") {
        metrics.paymentAttempts += 1;
      }

      // Track webhook metrics
      if (logEntry.event === "stripe_webhook_success") {
        metrics.webhookSuccesses += 1;
        metrics.webhookAttempts += 1;
      }
      if (logEntry.event === "stripe_webhook_processing_failed") {
        metrics.webhookAttempts += 1;
      }
    } catch (parseError) {
      // Skip unparseable lines
    }
  }

  // Calculate SLI values
  metrics.latencies.sort((a, b) => a - b);
  const p95Index = Math.floor(metrics.latencies.length * 0.95);
  metrics.latencyP95 = metrics.latencies[p95Index] || 0;

  metrics.availabilityPercent =
    metrics.totalRequests > 0 ? (metrics.successfulRequests / metrics.totalRequests) * 100 : 100;
  metrics.bookingSuccessPercent =
    metrics.bookingAttempts > 0 ? (metrics.bookingSuccesses / metrics.bookingAttempts) * 100 : 100;
  metrics.paymentSuccessPercent =
    metrics.paymentAttempts > 0 ? (metrics.paymentSuccesses / metrics.paymentAttempts) * 100 : 100;
  metrics.webhookSuccessPercent =
    metrics.webhookAttempts > 0
      ? (metrics.webhookSuccesses / metrics.webhookAttempts) * 100
      : 100;

  return metrics;
}

module.exports = {
  extractSLIMetricsFromLogs,
};
```

---

## PART 7 — Weekly SRE Review Process

### Weekly SRE Review Meeting (30 min)

**When:** Every Monday 10:00 AM (or agreed day).  
**Who:** SRE Lead, Backend Lead, Product Manager, On-call rotation.  
**Agenda:**

#### 1. SLO Status (5 min)

- [ ] Review dashboard: are all SLIs in green?
- [ ] Identify any amber/red SLIs.
- [ ] Calculate error budget burn for all SLIs.

**Questions to answer:**
- Are we on track for the month?
- Did we exceed any SLO? If yes, what was the root cause?
- Is burn rate projected to exhaust any SLI budget before month-end?

**Output:** SLO status summary (green/amber/red).

#### 2. Incidents & Root Causes (10 min)

- [ ] Review all incidents from past week.
- [ ] For each incident:
  - [ ] Root cause?
  - [ ] How much SLO budget consumed?
  - [ ] Was it preventable?
  - [ ] What's the fix/prevention plan?
  - [ ] Who is owner + due date?

**Example:**
```
Incident: Booking success rate dropped to 98.5% on 2026-02-17, 14:15.
Root cause: DB deadlock under concurrent booking race.
Budget consumed: 12 minutes (from 99.0% target).
Prevention: Implement booking slot version lock (Dev: in progress, due 2026-02-24).
```

#### 3. Error Budget Allocation (5 min)

- [ ] Remaining error budget for each SLI?
- [ ] Can we afford planned risky releases?
- [ ] Do we need a release freeze?

**Freeze decision tree:**
- If **any SLI has <= 20 minutes budget remaining** and burn rate >= 1.0x: **FREEZE**.
  - Only critical hotfixes allowed.
  - Must have explicit SRE approval before deploy.
- If **all SLIs have > 100 minutes budget**: **NORMAL** release process.
- If **50–100 minutes budget on any SLI**: **CAUTIOUS**. High-risk features require SRE pre-approval.

**Example decision:**
```
Availability: 180 min remaining (83%)  → NORMAL
Payment: 200 min remaining (93%)       → NORMAL
Booking: 45 min remaining (21%)        → CAUTIOUS (booking-related changes need approval)
Webhook: 210 min remaining (97%)       → NORMAL

Decision: NORMAL release process, but new booking features require SRE sign-off before deploy.
```

#### 4. Monitoring & Alerting Review (5 min)

- [ ] Did any expected alerts not fire?
- [ ] Did any false alarms occur?
- [ ] Do we need to tune alert thresholds?

**Example:**
```
Expected: High latency alert when query took 3000ms.
Actual: Alert fired, but 15 minutes late.
Action: Lower alert threshold from 2.5s to 2.0s; test in staging.

False alarm: Redis unavailable warning fired but it was a 2-sec blip.
Action: Increase minimum window from 1 alert to 2-alert threshold.
```

#### 5. Capacity Planning (5 min)

- [ ] Trends: is error rate increasing week-over-week?
- [ ] Load: any approaching resource limits (DB connections, Redis memory)?
- [ ] Do we need to scale or optimize?

**Example:**
```
Booking success rate trend: 99.2% (week 1), 99.0% (week 2), 98.8% (week 3).
Root: DB lock contention increasing as bookings grow.
Action: Plan DB index optimization (due 2026-03-03).
```

### Weekly Review Checklist

```
[ ] Gather SLO metrics from previous week (Sat–Fri).
[ ] Create incident summary.
[ ] Calculate remaining error budgets.
[ ] Decide on release freeze status.
[ ] Document alerts reviewed (tuning needed?).
[ ] Update tracking: link to Google Doc / JIRA.
[ ] Notify team of freeze status (if any).
```

### Release Freeze Criteria

**Automatic FREEZE declares if:**
1. Any SLI has <= 20 minutes budget remaining AND burn rate >= 1.0x in last 24 hours.
2. Payment success rate < 99.0% in last 6 hours (critical path).
3. Webhook processing success rate < 99.5% in last 6 hours.

**Freeze lifted when:**
1. Budget > 100 minutes AND burn rate < 0.5x for 12 consecutive hours.
2. Root cause of incident is fixed and verified in staging.

**Exception process:**
- Critical hotfix (payment/security) can override freeze with explicit SRE + Product Manager approval.
- Approval must be documented (Slack thread + JIRA comment).

### Launch Gating Checklist (Before Major Release)

Before deploying any significant feature or infrastructure change:

- [ ] SLO budget is > 120 min for all SLIs.
- [ ] Burn rate is < 0.5x for all SLIs over past 12 hours.
- [ ] No critical incidents in past 7 days (or root cause is resolved + tested).
- [ ] Load test results show no regression in latency p95.
- [ ] Canary or staged rollout plan is approved.
- [ ] Rollback procedure is documented and tested.
- [ ] Alert thresholds are tuned post-deploy.

**Sign-off required from:** SRE Lead + Backend Lead.

### SLO Review Meeting Output

Create a weekly summary (10-minute read):

```markdown
## SRE Weekly Review — Week of 2026-02-17

### SLO Status
| SLI | Target | Current | Budget Remaining | Trend |
|-----|--------|---------|------------------|-------|
| Availability | 99.5% | 99.8% | 165 min (76%) | ↑ |
| Latency p95 | 1500ms | 1240ms | 205 min (95%) | → |
| Booking Success | 99.0% | 98.9% | 45 min (21%) | ↓ |
| Payment Success | 99.5% | 99.7% | 210 min (97%) | → |
| Webhook Success | 99.9% | 99.95% | 215 min (99%) | → |

**Overall:** 3 Green, 0 Amber, 0 Red. Normal release process.

### Incidents Summary
1. [2026-02-17] Booking race condition (12 min budget consumed).
   - Root: Missing DB index.
   - Fix: Index added; deployed 2026-02-18.
   - Test: Load test confirms fix.

### Decisions
- **Release Freeze:** No. Budget is healthy across all SLIs.
- **Action Items:**
  - DB performance review (due 2026-02-24).
  - Update booking race condition test suite (due 2026-02-21).

### Next Week
- Monitor booking success trend (see if stays above 98.9%).
- Plan DB optimization for index coverage.
```

---

## Quick Reference: SLO Commands

### Calculate Monthly Error Budget

```bash
# For 99.5% SLO:
Monthly minutes: 30 * 24 * 60 = 43,200
Error budget: (100 - 99.5) / 100 * 43,200 = 216 minutes (~3.6 hours)

# For 99.0% SLO:
Error budget: (100 - 99.0) / 100 * 43,200 = 432 minutes (~7.2 hours)
```

### Check Burn Rate from Logs

```bash
# Count 5xx errors in past 5 minutes (approx):
tail -n 5000 backend/logs/application.log | grep '"statusCode":5[0-9][0-9]' | wc -l

# Estimate error rate:
# If 50 errors in 5000 rows = 1% error rate
# Expected error budget: 0.5%
# Burn rate: 1% / 0.5% = 2.0x (warning)
```

### Alert Thresholds Quick Table

```
SLI: Availability (99.5% SLO)
  Fast burn CRITICAL (5min):  > 2.5% error rate (5x error budget)
  Fast burn HIGH (15min):     > 1.0% error rate (2x error budget)
  Slow burn MEDIUM (1hr):     > 0.5% error rate (at SLO boundary)

SLI: Booking Success (99.0% SLO)
  CRITICAL (5min):   < 90% success rate (1.0% failure = 10x budget)
  HIGH (15min):      < 96% success rate (0.4% failure = 4x budget)
  MEDIUM (1hr):      < 98.5% success rate (at SLO boundary)

SLI: Payment Success (99.5% SLO)
  CRITICAL (5min):   < 95% success rate (5x budget)
  HIGH (15min):      < 99% success rate (2x budget)
  MEDIUM (1hr):      > 99.25% failure acceptable
```

---

## Appendix: Sample Monthly SLO Report

```markdown
# MaleBangkok SLO Performance Report — January 2026

## Executive Summary
- **Overall Status:** HEALTHY
- **All SLOs met:** ✓
- **Error budget consumed:** 35% (266 of 720 total budget minutes)
- **Incidents:** 2 minor (no customer impact)
- **Burn rate:** 0.42x monthly average

## SLI Performance

### Availability (Target: 99.5%)
- **Achieved:** 99.8%
- **Monthly downtime:** 5 minutes (vs. 216 min budget)
- **Incidents:** None
- **Trend:** Stable ↑

### Latency p95 (Target: 1500ms)
- **Achieved:** 1320ms
- **Peak:** 2100ms (2026-01-15, guide search with 1000+ results)
- **Incidents:** 1 (resolved with index optimization)
- **Trend:** Stable →

### Booking Success (Target: 99.0%)
- **Achieved:** 99.3%
- **Failed bookings:** 42 of 6000 attempts
- **Incidents:** 1 (race condition on 2026-01-22, ~8 failed bookings)
- **Trend:** Stable ↑

### Payment Success (Target: 99.5%)
- **Achieved:** 99.8%
- **Failed payments:** 4 of 2000 intent creations
- **Incidents:** None
- **Trend:** Stable →

### Webhook Processing (Target: 99.9%)
- **Achieved:** 99.96%
- **Delayed processing:** 1 event (resolved within 5 min; no state drift)
- **Incidents:** None
- **Trend:** Excellent ↑

## Budget Analysis
| SLI | Budget (min) | Consumed (min) | Remaining | % Used |
|-----|--|--|--|--|
| Availability | 216 | 8 | 208 | 4% |
| Latency p95 | 216 | 18 | 198 | 8% |
| Booking | 432 | 92 | 340 | 21% |
| Payment | 216 | 5 | 211 | 2% |
| Webhook | 43 | 1 | 42 | 2% |
| **Total** | **1123** | **124** | **999** | **11%** |

**Conclusion:** All budgets in healthy state. No release freeze needed.

## Recommendations
1. Continue monitoring booking race conditions; performance is good but trending up in load.
2. Consider pre-planning DB optimization for Q2 if booking growth continues.
3. Payment and webhook systems performing excellently; maintain current tooling.
```

---

**End of Production SLO & Error Budget Framework**

## Quick Start

1. **This week:**
   - [ ] Agree on target SLOs with product/engineering.
   - [ ] Set up dashboard (manual or tool-based).
   - [ ] Schedule first weekly review meeting.

2. **This month:**
   - [ ] Instrument critical paths with SLI logging.
   - [ ] Implement burn rate alerting.
   - [ ] Build SLI extraction job (or integrate with log aggregator).

3. **Key files to track:**
   - Dashboard link / tool.
   - Alert policy rules (YAML or config).
   - Weekly review meeting notes (shared doc).
   - Error budget tracker (spreadsheet or tool).
