# MaleBangkok Production Game Day Playbook

**Version:** 1.0  
**Date:** 2026-02-19  
**Owner:** SRE / Production Readiness Lead  
**System:** Node.js (Express) + MySQL + Redis + Stripe  
**Environment:** Hostinger Cloud (Production-prep drill)

---

## PART 1 — Game Day Objectives

### 1.1 Primary success criteria

- No **P0** outcomes during scenarios:
  - No confirmed duplicate charge.
  - No confirmed double booking for same guide + slot.
  - No irreversible data inconsistency across booking/payment tables.
- Recovery objectives are met in all injected failures:
  - API error spike stabilized within **15 minutes**.
  - Critical path (search → book → pay → confirmation) restored within **20 minutes**.
- Data integrity remains correct:
  - Idempotency guarantees hold under retries/replays.
  - Payment and booking states converge to valid final state.
- Monitoring and alerting are actionable:
  - Alerts fire within threshold windows.
  - On-call can identify root signal and execute runbook without escalation dead-end.

### 1.2 Definition of “launch-ready”

System is launch-ready when all are true:

1. Mandatory chaos scenarios pass (see Part 3).
2. P0/P1 defects from drill are zero open (or accepted with approved mitigation + owner + due date).
3. Go/No-Go matrix score is in **GO** band (see Part 6).
4. Incident command workflow runs end-to-end with clear ownership and communication.
5. Rollback procedures are tested and completed in drill without data loss.

### 1.3 Systems under test

- **Frontend/API**: booking flow endpoints, auth flow, payment initiation, webhook processing.
- **Database (MySQL)**: booking atomicity, transaction behavior, lock contention, failover/reconnect behavior.
- **Redis**: cache path, degraded behavior when unavailable, latency impact.
- **Stripe integration**: payment intent creation, idempotency keys, webhook replay and ordering resilience.
- **Operational controls**: logging, alerts, dashboards, deployment/rollback controls, runbooks.

### 1.4 Required participants and roles

- **Incident Commander (IC)**: runs timeline, decisions, severity declaration.
- **Deputy IC / Scribe**: records events, actions, timestamps, outcomes.
- **Backend Lead**: API and domain logic owner.
- **DBA / Data Engineer**: MySQL diagnostics and query/connection interventions.
- **Infra/SRE Engineer**: Hostinger infra health, process restarts, capacity actions.
- **Payments Engineer**: Stripe events, webhook correctness, reconciliation checks.
- **QA/Load Engineer**: executes injection scripts and validates expected behavior.
- **Comms Owner**: stakeholder updates, launch gate communication.

### 1.5 Pre-flight checklist

- [ ] Freeze non-essential deploys for drill window.
- [ ] Confirm rollback artifact/version is available and tested in staging.
- [ ] Confirm DB backup/snapshot timestamp and restore instructions are current.
- [ ] Confirm Stripe test mode keys/webhook secret configured for drill environment.
- [ ] Confirm synthetic test users/cards/guide slots are provisioned.
- [ ] Confirm dashboards + alerts are visible to all responders.
- [ ] Confirm incident channel and bridge call are live.
- [ ] Confirm runbook links and pager routing are valid.
- [ ] Confirm load/failure scripts are dry-run validated.
- [ ] Define drill stop condition and escalation path.

---

## PART 2 — Test Environment Setup (Step-by-Step)

### 2.1 Strategy: staging vs production

- [ ] Run full scenario set in **staging first** using production-like sizing and config.
- [ ] Run selected high-risk scenarios in production-prep window with safeguards:
  - [ ] low concurrency caps,
  - [ ] test-only users,
  - [ ] strict time window,
  - [ ] IC authorization before each injection.
- [ ] Do **not** run destructive DB outage tests in production unless approved and reversible.

### 2.2 Stripe safe test mode usage

- [ ] Use Stripe **test mode API keys** only for drill traffic.
- [ ] Configure separate webhook endpoint for drill validation when possible.
- [ ] Use idempotency key per client payment attempt and preserve across retries.
- [ ] Test cards:
  - [ ] `4242 4242 4242 4242` success,
  - [ ] `4000 0000 0000 9995` decline,
  - [ ] `4000 0000 0000 3220` 3DS/auth flow.
- [ ] Verify webhook signature validation remains enabled during drill.

### 2.3 Test accounts and seed data

- [ ] Create at least:
  - [ ] 20 normal customers,
  - [ ] 10 premium customers,
  - [ ] 15 guides with overlapping availability,
  - [ ] 1 admin user.
- [ ] Seed booking slots with intentional overlap (same guide/time) for race tests.
- [ ] Seed payment intents and booking requests in pending state for replay tests.
- [ ] Ensure seeded data is tagged (`gameday=true`) for cleanup.

### 2.4 Feature flags and controls

- [ ] Enable/confirm flags for:
  - [ ] `PAYMENT_IDEMPOTENCY_ENFORCED`,
  - [ ] `BOOKING_ATOMIC_LOCKING`,
  - [ ] `REDIS_OPTIONAL_FALLBACK`,
  - [ ] `WEBHOOK_DEDUP_ENABLED`.
- [ ] Add temporary drill flag:
  - [ ] `GAMEDAY_VERBOSE_OBSERVABILITY=true` (increases diagnostic logging only during drill).
- [ ] Confirm flags are reversible without redeploy.

### 2.5 Logging level requirements

- [ ] API/service logs at `INFO` baseline.
- [ ] Payment and booking conflict handlers at `DEBUG` for drill window.
- [ ] PII/token redaction validated before starting.
- [ ] Correlation IDs present on all request logs.

### 2.6 Hostinger-specific preparation notes

- [ ] Confirm Hostinger Cloud instance CPU/RAM headroom > 30% before drill.
- [ ] Confirm disk free space > 20% (logs + temp growth).
- [ ] Validate service restart command and permissions on host.
- [ ] Confirm Hostinger backup/snapshot point created immediately before drill.
- [ ] Confirm firewall/allowlist permits load generator source IPs.
- [ ] Prepare quick access to Hostinger panel metrics for CPU, RAM, network, and uptime.
- [ ] Record exact application process manager commands (e.g., `pm2 restart <app>`).

---

## PART 3 — Failure Injection Scenarios (CRITICAL)

| Scenario | How to simulate | Expected system behavior | What to monitor | Pass/Fail criteria | Rollback action if fail |
|---|---|---|---|---|---|
| 1) Double-click payment storm | Fire 20–100 parallel `POST /payment` calls for same booking + same idempotency key; then repeat with mixed keys. Use k6/artillery script with burst profile. | One successful charge max per logical order; duplicates rejected or mapped to same payment result; API returns stable idempotent response. | Stripe PaymentIntent count vs order count, duplicate charge detector, API 409/200 distribution, payment idempotency logs. | **Pass:** duplicate charges = 0; retries deterministic. **Fail:** >0 duplicate charge or inconsistent payment state. | Disable checkout entry; stop burst script; run reconciliation script; refund duplicates if any; hotfix idempotency gate; rerun scenario. |
| 2) Concurrent same-slot booking race | Send concurrent booking requests for same `guide_id + time_slot` from 10–50 users simultaneously. | Exactly one confirmed booking for slot (or capacity-limited count if designed); losers receive conflict response. | DB lock wait, deadlock count, booking conflict logs, booking table uniqueness/constraint behavior. | **Pass:** no double booking; deterministic conflict handling. **Fail:** same slot assigned twice. | Temporarily lock slot inventory endpoint; invalidate affected slots; manual correction + customer comms; patch transaction/unique constraint path. |
| 3) Stripe webhook replay burst | Replay same webhook event IDs 20+ times; replay out-of-order event sequence for one payment intent. | Dedup logic ignores already-processed event IDs; final booking/payment state remains correct and single-applied. | Webhook processing latency, dedup hit ratio, webhook error count, event processing audit table. | **Pass:** replay-safe, no duplicated side effects. **Fail:** repeated state transition or duplicate writes. | Pause webhook consumer route briefly; process queued events after dedup fix; reconcile mismatches from Stripe event log. |
| 4) Database temporary outage | Block DB port from app for 2–5 minutes (firewall rule or wrong host env in canary instance), then restore. | App fails gracefully (5xx with clear error), no stuck workers, reconnects automatically when DB returns. | DB connection pool saturation, API error rate, reconnect logs, queue depth, request timeout rate. | **Pass:** recovery without restart or with documented controlled restart; no corruption. **Fail:** prolonged outage after DB restore or data inconsistency. | Revert network/env change; recycle app process; drain/retry safe queues; validate DB write consistency; invoke rollback if unrecoverable. |
| 5) Redis unavailable | Stop Redis service or block Redis port for 5 minutes. | Cache misses degrade to DB path; no crash loop; latency increase within accepted threshold. | Redis connection errors, API latency p95/p99, DB QPS increase, cache fallback logs. | **Pass:** service remains functional; error rate within SLO exception budget. **Fail:** widespread 5xx/crashes. | Re-enable Redis; reduce traffic via rate limits; temporarily disable cache-dependent features; scale DB reads if needed. |
| 6) JWT expiration mid-flow | Issue short-lived token (e.g., 60s), start booking flow, let token expire before payment submit. | Proper 401/refresh-required behavior; no orphan paid-unbooked state; user can resume safely after re-auth. | Auth error rate, abandoned checkout count, pending booking timeout cleanup job metrics. | **Pass:** clean user recovery path and no invalid state transitions. **Fail:** payment proceeds with invalid auth or orphan state created. | Force token refresh at checkout boundary; invalidate stale sessions; reconcile pending states; patch auth middleware boundary checks. |
| 7) Slow database response | Add artificial latency (`SELECT SLEEP(1-3)` in controlled path or tc/netem equivalent), run normal load. | Timeouts/circuit behavior triggered predictably; system degrades gracefully; no unbounded queue growth. | DB query latency p95/p99, API latency, timeout count, worker backlog, CPU saturation. | **Pass:** p95 remains within launch gate threshold or controlled reject path. **Fail:** cascading failures/timeouts across services. | Remove latency injection; reduce concurrency; tune pool/timeouts; deploy query/index fix before rerun. |
| 8) Partial network failure | Drop outbound traffic from app to Stripe OR intermittent packet loss (10–30%) to DB/Redis for subset of instances. | Retries with backoff, idempotent retries safe; partial failures isolated; no global outage. | Upstream dependency error rates, retry storm indicators, queue retries, instance-level error skew. | **Pass:** bounded retries, no retry storm, no data corruption. **Fail:** thundering herd, saturation, or inconsistent state. | Remove network impairment; disable aggressive retries; restart affected nodes; run consistency checks and replay safe operations. |

---

## PART 4 — Observability Checklist (Operational)

### 4.1 Must-watch during Game Day

- [ ] **API health:** request rate, 4xx/5xx rate, p50/p95/p99 latency per endpoint.
- [ ] **Booking integrity:** booking conflict count, successful booking count, duplicate slot detection query.
- [ ] **Payment integrity:** payment attempts, successful captures, failed/declined rates, duplicate charge indicator.
- [ ] **Webhook health:** delivery success %, processing latency, dedup hits, dead-letter count (if used).
- [ ] **DB health:** connections used, slow queries, lock waits/deadlocks, replication/IO health (if replica exists).
- [ ] **Redis health:** availability, latency, hit rate, evictions, reconnect storms.
- [ ] **Infra health (Hostinger):** CPU, RAM, disk I/O, network throughput/error spikes.

### 4.2 Sample log queries

Use your log tool equivalent (grep/Loki/ELK). Examples:

```bash
# Correlation trace by request ID
grep "req_id=<REQUEST_ID>" backend/logs/*.log

# Payment idempotency events
grep -E "idempotency|duplicate charge|payment_intent" backend/logs/*.log

# Booking slot conflicts
grep -E "booking conflict|slot already taken|deadlock" backend/logs/*.log

# Webhook replay / dedup
grep -E "webhook.*replay|dedup|event_id" backend/logs/*.log

# Redis fallback activation
grep -E "redis.*unavailable|cache fallback" backend/logs/*.log
```

SQL validation checks:

```sql
-- Detect duplicate confirmed bookings for same guide+slot
SELECT guide_id, slot_start, COUNT(*) c
FROM bookings
WHERE status='confirmed'
GROUP BY guide_id, slot_start
HAVING c > 1;

-- Compare logical orders vs successful charges (model-specific adjust)
SELECT order_id, COUNT(*) c
FROM payments
WHERE status='succeeded'
GROUP BY order_id
HAVING c > 1;
```

### 4.3 Alert thresholds for drill

- **Critical (page immediately):**
  - API 5xx rate > 5% for 5 min.
  - Duplicate charge detected > 0.
  - Confirmed duplicate booking > 0.
  - DB connection utilization > 90% for 3 min.
- **High:**
  - p95 latency > 2.5s for 10 min.
  - Webhook failure rate > 2% for 10 min.
  - Redis unavailable > 2 min during active flow.
- **Medium:**
  - Cache hit rate drops below 50% for 15 min.
  - Lock wait timeout count increasing continuously for 10 min.

### 4.4 Red flags (immediate IC attention)

- Divergence between Stripe event status and internal payment status.
- Retry storm pattern (request volume up while success flat/down).
- Repeated process restarts or memory growth without recovery.
- Manual intervention needed more than once for same scenario.

---

## PART 5 — Incident Response Runbook

### 5.1 Payment anomaly (duplicate charge / mismatched status)

**Who responds**
- Primary: Payments Engineer
- Support: Backend Lead, IC, Comms Owner

**First 5 minutes**
1. IC declares severity and opens incident timeline.
2. Freeze new payment attempts for affected path (flag or temporary guard).
3. Identify impacted transaction IDs and user scope.
4. Verify Stripe dashboard vs internal DB state.

**Stabilization steps**
1. Enable/verify strict idempotency enforcement.
2. Stop replay source (client retry loop/webhook duplicate source).
3. Execute reconciliation script for affected orders.
4. Initiate refunds for confirmed duplicate charges.

**Communication template**
- “We detected a payment processing anomaly impacting <N> transactions between <T1-T2>. Checkout is temporarily protected while reconciliation and refunds are in progress. Next update in 15 minutes.”

**Rollback trigger**
- If duplicates continue for >10 min after guardrails, rollback to last known stable payment service version.

---

### 5.2 Double booking detected

**Who responds**
- Primary: Backend Lead
- Support: DBA, IC, Comms Owner

**First 5 minutes**
1. Lock booking creation for affected guide/slot range.
2. Run duplicate booking SQL check.
3. Identify canonical booking (earliest valid payment/booking timestamp).

**Stabilization steps**
1. Cancel conflicting duplicate records with audit reason.
2. Trigger user remediation flow (rebook/refund/credit based on policy).
3. Patch/enforce DB uniqueness/transaction boundary if missing.

**Communication template**
- “A booking consistency issue was detected for select slots. We have paused affected slot confirmations and are contacting impacted users with resolution options.”

**Rollback trigger**
- If new duplicates still occur after mitigation patch or guard, rollback booking service.

---

### 5.3 Webhook failure

**Who responds**
- Primary: Payments Engineer
- Support: Backend Lead, SRE, IC

**First 5 minutes**
1. Confirm webhook endpoint health and signature validation.
2. Check failure mode: auth/signature errors vs timeout vs 5xx.
3. Pause non-essential downstream consumers if retries are amplifying load.

**Stabilization steps**
1. Restore endpoint capacity and timeout settings.
2. Replay failed Stripe events safely using dedup protections.
3. Validate event processing lag returns to normal.

**Communication template**
- “Stripe webhook processing is degraded; payments are being reconciled and replayed safely. User-facing checkout remains <status>. Next update in 15 minutes.”

**Rollback trigger**
- If webhook processing cannot recover within 20 min and payment state drift grows, rollback webhook handler release.

---

### 5.4 DB connection exhaustion

**Who responds**
- Primary: DBA / SRE
- Support: Backend Lead, IC

**First 5 minutes**
1. Confirm active connections, waiting threads, and pool limits.
2. Identify top slow queries / lock holders.
3. Apply temporary traffic control (rate limit non-critical endpoints).

**Stabilization steps**
1. Kill pathological long-running sessions if safe.
2. Tune pool limits/timeouts to avoid stampede.
3. Add/remove read pressure via cache strategy adjustments.
4. Restart app workers gracefully if pool is wedged.

**Communication template**
- “Database connection saturation is causing elevated latency/errors. We have applied traffic controls and are reducing lock/slow query pressure.”

**Rollback trigger**
- If pool saturation persists >15 min post-mitigation, rollback latest DB-impacting release.

---

### 5.5 High error-rate spike

**Who responds**
- Primary: IC + SRE
- Support: service owners on affected path

**First 5 minutes**
1. Confirm scope by endpoint/service.
2. Check recent changes (deploy, config, dependency health).
3. Initiate mitigation: rollback candidate release or disable risky feature flag.

**Stabilization steps**
1. Shift to degraded mode if available (read-only/fallback).
2. Recover dependencies (DB/Redis/network).
3. Verify error-rate and latency return under thresholds.

**Communication template**
- “We are investigating elevated API errors impacting <scope>. Mitigation is in progress with <rollback/flag change>. Next update in 10–15 minutes.”

**Rollback trigger**
- Error rate remains >5% for 10 min after first mitigation.

---

## PART 6 — Go/No-Go Decision Framework (Objective Gate)

### 6.1 Quantitative launch thresholds

| Category | Launch threshold | Blocker if violated |
|---|---:|---:|
| Duplicate charges | 0 | Yes |
| Duplicate confirmed bookings per slot | 0 | Yes |
| Scenario pass rate (mandatory 8) | 100% mandatory, >= 90% overall including optional | Yes |
| API 5xx during drill steady-state | < 1% | Yes if >= 2% sustained |
| API p95 latency (critical endpoints) | < 1500 ms | Yes if > 2500 ms sustained |
| Webhook processing success | >= 99% within 5 min window | Yes if < 98% |
| DB connection utilization | < 80% steady, < 90% peak | Yes if >= 90% sustained |
| Redis outage survivability | No crash-loop, graceful degrade proven | Yes |
| Incident MTTR (critical injected failures) | <= 20 min | Yes if > 30 min |

### 6.2 Required pass/fail policy

- **Mandatory scenarios:** all 8 listed in Part 3 must pass.
- **No unresolved P0/P1** from Game Day at launch decision time.
- Any accepted risk requires:
  - documented mitigation,
  - named owner,
  - due date,
  - rollback readiness.

### 6.3 Blocker conditions (automatic NO-GO)

- Any confirmed duplicate charge.
- Any confirmed double booking in same slot.
- Inability to recover DB/Redis outage scenario in runbook time.
- Alerting failures where critical signals do not trigger.
- Missing rollback path or rollback failure in drill.

### 6.4 Risk scoring model

Score each failed/weak area using:  
**Risk Score = Impact (1–5) × Likelihood (1–5) × Detectability Gap (1–3)**

- **1–15:** Low (acceptable with owner)
- **16–30:** Medium (must fix or mitigate before launch)
- **31–75:** High (NO-GO)

Decision rule:
- **GO:** No blockers + all mandatory pass + no high risk.
- **CONDITIONAL GO:** No blockers, medium risks have approved mitigation plan.
- **NO-GO:** Any blocker or any high risk open.

---

## PART 7 — Post–Game Day Actions (Structured Plan)

### 7.1 Documenting results

- [ ] Publish incident-style report within 24 hours:
  - [ ] timeline,
  - [ ] scenario outcomes,
  - [ ] metrics snapshots,
  - [ ] detected defects,
  - [ ] decisions and owners.
- [ ] Attach evidence:
  - [ ] dashboard screenshots,
  - [ ] alert history,
  - [ ] SQL validation outputs,
  - [ ] Stripe reconciliation output.

### 7.2 Bug triage process

- [ ] Triage meeting within 1 business day.
- [ ] Categorize by severity:
  - [ ] **P0:** data loss, duplicate charges, double booking.
  - [ ] **P1:** critical path unstable, recovery failure.
  - [ ] **P2:** degraded but acceptable with workaround.
- [ ] Assign owner + ETA + verification plan for each issue.

### 7.3 Fix prioritization model

Prioritize by weighted score:  
**Priority = (Severity × 3) + (Customer Impact × 2) + (Recurrence Risk × 2) + (Fix Effort × -1)**

- [ ] Execute highest score first.
- [ ] Bundle related fixes to avoid repeated risky deploys.
- [ ] Require rollback notes for each production fix.

### 7.4 Re-test criteria

- [ ] Any P0/P1 fix requires targeted scenario rerun + one adjacent scenario.
- [ ] If DB or payment path changed, rerun scenarios 1–4 minimum.
- [ ] If cache/auth/network handling changed, rerun scenarios 5–8 minimum.
- [ ] Re-test must include observability validation (alerts and dashboards).

### 7.5 Soft launch readiness checklist

- [ ] All mandatory scenarios pass in final rerun.
- [ ] No open P0/P1 issues.
- [ ] On-call rotation and escalation matrix confirmed.
- [ ] Runbooks updated with lessons learned.
- [ ] Launch-day freeze window and rollback owner confirmed.
- [ ] Executive/stakeholder GO sign-off recorded.

---

## Drill Execution Control Sheet (Quick Use)

- **T-60 min:** Pre-flight complete, dashboards green, backup confirmed.
- **T-45 min:** Team briefing, role confirmation, stop condition review.
- **T-30 min:** Baseline metrics capture.
- **T-0:** Start scenario execution in planned order.
- **During drill:** IC logs every injection start/end and outcome.
- **T+End:** Go/No-Go scoring and decision.
- **T+24h:** Publish report and remediation plan.
