# SLO Weekly Review Template & Checklist

**Review Date:** _____________  
**Reviewer:** _____________  
**Period:** Previous 7 calendar days (Mon–Sun)

---

## 1. SLO Status Summary (GREEN / AMBER / RED)

| SLI | Target | Actual | Status | Budget Remaining | Notes |
|-----|--------|--------|--------|------------------|-------|
| Availability | 99.5% | ___ % | [ ] G [ ] A [ ] R | ___ min (___ %) | |
| Latency p95 | 1500ms | ___ ms | [ ] G [ ] A [ ] R | ___ min (___ %) | |
| Booking Success | 99.0% | ___ % | [ ] G [ ] A [ ] R | ___ min (___ %) | |
| Payment Success | 99.5% | ___ % | [ ] G [ ] A [ ] R | ___ min (___ %) | |
| Webhook Success | 99.9% | ___ % | [ ] G [ ] A [ ] R | ___ min (___ %) | |
| Matching p95 | 1000ms | ___ ms | [ ] G [ ] A [ ] R | ___ min (___ %) | |

**Overall Status:** [ ] GREEN (all on track) [ ] AMBER (attention needed) [ ] RED (critical)

---

## 2. Incidents & Root Causes

### Incident 1

- **Date/Time:** ___________
- **SLI Impacted:** ___________
- **Duration:** ___ minutes
- **Budget Consumed:** ___ minutes
- **Root Cause:** ___________
- **Customer Impact:** [ ] None [ ] Minor [ ] Major
- **Severity:** [ ] P1 [ ] P2 [ ] P3
- **Fix Status:** [ ] Deployed [ ] In Progress [ ] Planned (due _____)
- **Prevention Plan:** ___________

### Incident 2

[Repeat above]

---

## 3. Error Budget & Release Freeze Decision

**Total Remaining Budget (all SLIs):** ___ minutes of ___ (% remaining)

**Burn Rate Trend:**
- [ ] Excellent (< 0.3x) — ahead of expectation
- [ ] Healthy (0.3–0.7x) — on pace
- [ ] Caution (0.7–1.0x) — approaching SLO boundary
- [ ] Warning (1.0–2.0x) — will exhaust budget in days
- [ ] Critical (> 2.0x) — immediate action required

**Release Freeze Status:**

- [ ] **NORMAL** – Proceed with normal release process.
  - All SLI budgets > 100 min remaining.
  - Burn rate < 0.5x.

- [ ] **CAUTIOUS** – Proceed with caution; high-risk features require SRE approval.
  - One or more SLI budgets 50–100 min remaining.
  - Document approval in JIRA comment before deploy.

- [ ] **FREEZE** – Only critical hotfixes. All other deploys blocked.
  - One or more SLI budgets ≤ 20 min remaining AND burn rate ≥ 1.0x.
  - Require explicit SRE + Product Manager sign-off.
  - Escalate to leadership.

**Projected Status by Month-End:** ________________

---

## 4. Monitoring & Alerts Tuning

### Alerts That Fired (True Positives)

| Alert Name | Date/Time | Fired Early? | Fired Late? | Action |
|------------|-----------|--------------|------------|--------|
| __________ | _________ | [ ] Yes [ ] No | [ ] Yes [ ] No | [ ] Tune |
| __________ | _________ | [ ] Yes [ ] No | [ ] Yes [ ] No | [ ] Tune |

### False Alarms (Need Tuning)

| Alert | Reason | New Threshold | Owner | ETA |
|-------|--------|---------------|-------|-----|
| _____ | _____ | _____ | _____ | _____ |

### Missing Alerts (Should Have Fired)

| Alert Name | What Happened | Why Missed | Fix | Owner | ETA |
|------------|---------------|-----------|-----|-------|-----|
| __________ | __________ | __________ | ____ | ____ | ____ |

---

## 5. Capacity & Scaling

**Traffic/Load Trends:**
- [ ] Flat (no change)
- [ ] Gradual increase (10–20% week-over-week)
- [ ] Sharp increase (> 20% week-over-week)
- [ ] Unusual spikes (correlate with feature release / marketing)

**Resource Utilization (Last 7 Days):**
- DB connections: ___ of ___ peak
- Redis memory: ___ MB of ___ MB
- API p95 latency trend: [ ] improving [ ] stable [ ] degrading
- Booking/payment volumes: ___ / ___ (week-over-week change: ___ %)

**Scaling Decisions:**
- [ ] No action needed (healthy margins)
- [ ] Optimize (index/query tuning) — Owner: _____, Due: _____
- [ ] Scale up (add resources) — Owner: _____, Due: _____
- [ ] Plan architectural change — Owner: _____, Due: _____

---

## 6. Action Items & Owner Tracking

| Item | Owner | Due Date | Status |
|------|-------|----------|--------|
| _____ | _____ | _____ | [ ] Not started [ ] In progress [ ] Done |
| _____ | _____ | _____ | [ ] Not started [ ] In progress [ ] Done |
| _____ | _____ | _____ | [ ] Not started [ ] In progress [ ] Done |

---

## 7. Next Week Preview

**Known Risks / Planned Changes:**
- [ ] Major frontend release (date: _____) — SRE approval: [ ] Approved [ ] Pending [ ] Rejected
- [ ] DB migration (date: _____) — Rollback plan: [ ] Ready [ ] In progress
- [ ] Marketing campaign (expected traffic increase: ___ %) — Capacity check: [ ] Done [ ] Needed
- [ ] Third-party dependency update (date: _____) — Test results: [ ] Passed [ ] Failed [ ] Pending

**Anticipated Budget Consumption:**
- Projected burn rate next week: ___ x
- Remaining budget at week-end (estimate): ___ minutes

---

## 8. Sign-Off

- [ ] Dashboard & metrics reviewed by SRE Lead
- [ ] Incidents investigated; root causes documented
- [ ] Action items assigned with due dates
- [ ] Release freeze decision communicated to team
- [ ] Next week's risks assessed

**SRE Lead Sign-Off:** _________________ **Date:** _____________

**Product Manager Awareness:** _________________ **Date:** _____________

---

## Notes & Observations

(Use this section for anything not covered above: team feedback, process improvements, stakeholder updates, etc.)

_________________________________________________________________________

_________________________________________________________________________

_________________________________________________________________________
