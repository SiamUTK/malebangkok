# SLO Implementation Quick Start (Next 4 Weeks)

## Week 1: Foundation Setup

### Goals
- [ ] Agree on target SLOs with team.
- [ ] Set up basic SLI logging infrastructure.
- [ ] Create manual dashboard / checklist.

### Tasks

**Day 1–2:**
- [ ] Review [production-slo-error-budget-framework.md](production-slo-error-budget-framework.md) as team.
- [ ] Confirm SLO targets with Product Manager + Engineering Lead.
- [ ] Decide: manual tracking vs. tool-based (Grafana, Datadog, etc.)?

**Day 3–5:**
- [ ] Copy `.env.slo.example` to `.env.slo` and configure values.
- [ ] Deploy sliLogger utility to backend.
- [ ] Integrate SLI logging into:
  - [ ] `controllers/bookingController.js`
  - [ ] `controllers/paymentController.js`
  - [ ] `middleware/requestLogger.js` for latency tracking
- [ ] Test logging in staging; verify SLI events appear in logs.

**By End of Week:**
- [ ] Manual SLO dashboard created (Google Sheets or similar).
- [ ] First baseline metrics captured (availability, latency, success rates).
- [ ] Weekly review meeting scheduled (recurring Monday 10 AM).

---

## Week 2: Metric Aggregation & Alerting

### Goals
- [ ] Aggregate SLI metrics into readable form.
- [ ] Set up burn rate alerting.
- [ ] Document release freeze process.

### Tasks

**Day 1–2:**
- [ ] Create metrics extraction script (or use Better Stack/Grafana if available).
- [ ] Extract last 7 days of SLI data; populate dashboard.
- [ ] Calculate burn rates for each SLI.

**Day 3–5:**
- [ ] Implement burn rate alerts in alert service:
  - [ ] Fast burn (>= 5x) → Critical alert
  - [ ] Slow burn (1–5x) → High alert
  - [ ] Threshold breach (payment/booking failure) → immediate alert
- [ ] Test alerts in staging (trigger scenarios; verify Slack notification).
- [ ] Document release freeze automation rules in wiki/JIRA.

**By End of Week:**
- [ ] Dashboard shows 7-day rolling SLI metrics + burn rates.
- [ ] Burn rate alerts integrated and tested.
- [ ] Release freeze decision tree documented.

---

## Week 3: Weekly Review Process & Documentation

### Goals
- [ ] Run first weekly SRE review meeting.
- [ ] Calibrate alert thresholds based on real data.
- [ ] Document process for future.

### Tasks

**Day 1 (Monday 10 AM):**
- [ ] **First Weekly Review Meeting:**
  - [ ] Review SLO status (all SLIs green/amber/red).
  - [ ] Check for incidents (if any) and root causes.
  - [ ] Calculate remaining error budgets.
  - [ ] Decide: release freeze or normal process?
  - [ ] Record meeting notes using template.

**Day 2–3:**
- [ ] Tune alert thresholds based on week 1 data.
  - Check: Did alerts fire too early? Too late?
  - Adjust window sizes / thresholds as needed.
- [ ] Update documentation with any process refinements.

**Day 4–5:**
- [ ] Communicate results to team:
  - [ ] Email: SLO status + budget remaining + release freeze status.
  - [ ] Slack: brief status update.
  - [ ] Post meeting notes to shared drive.
- [ ] Schedule next week's review.

**By End of Week:**
- [ ] Weekly review process established + documented.
- [ ] Team alignment on SLO targets and release freeze policy.
- [ ] Baseline alert tuning complete.

---

## Week 4: Hardening & Scale-Out

### Goals
- [ ] Refine alert policies based on 2 weeks of data.
- [ ] Integrate SLO observability into on-call runbook.
- [ ] Plan longer-term monitoring (if needed).

### Tasks

**Day 1–2:**
- [ ] Analyze 2 weeks of incident data.
  - [ ] Were the right alerts firing?
  - [ ] Did we catch issues early enough?
  - [ ] Any false alarms?
- [ ] Refine alert thresholds for production deployment.

**Day 3–4:**
- [ ] Add SLO section to on-call runbook:
  - [ ] Quick reference table (SLO targets + alert thresholds).
  - [ ] How to check budget status if paged.
  - [ ] When to escalate to SRE lead.
- [ ] Update incident response template to include SLO impact.

**Day 5:**
- [ ] Review & decision: invest in tool-based monitoring?
  - [ ] If manual process is working: keep as-is for now.
  - [ ] If manual process is becoming burden: evaluate tools (Grafana, Datadog, Better Stack).
- [ ] Plan for month-end SLO report (due end of Feb).

**By End of Week:**
- [ ] Production SLO monitoring fully live.
- [ ] Team trained on weekly review process.
- [ ] On-call runbook updated.
- [ ] Release freeze automation tested end-to-end.

---

## Success Criteria

By end of 4 weeks:

- [ ] All team members can explain the SLO targets and what they mean.
- [ ] Weekly review meeting runs without chaos (< 45 min total).
- [ ] Burn rate alerts fire correctly on test scenarios.
- [ ] Release freeze decision is automatic and respected by engineering.
- [ ] Dashboard is consulted by team before major deployments.
- [ ] First month-end SLO report is published with zero surprises.

---

## Tools Decision Tree

**Is the manual process (spreadsheet + logs) working?**
- [ ] Yes → Keep as-is for 1–2 months. Revisit monthly.
- [ ] No → Evaluate one of:

**If you want to scale observability:**

| Tool | Effort | Cost | Best For |
|------|--------|------|----------|
| **Grafana + Loki** | High (self-hosted) | Low | Full central logging; custom dashboards. |
| **Datadog** | Low (SaaS) | Medium–High | Complete APM + logs + metrics; smallest ops burden. |
| **Better Stack** | Medium (SaaS) | Low–Medium | Logs only; good for centralized search. |
| **Manual (Google Sheets)** | Low | None | Early stage; works if team is small. |

**Recommendation for MaleBangkok at current size:**
- **Now (month 1):** Manual spreadsheet + log grep.
- **Month 2–3:** Evaluate Better Stack logs if manual is tedious.
- **Month 4+:** Consider Datadog if traffic/complexity outgrows manual process.

---

## Cost Estimation (if tool-based)

| Tool | Monthly Cost | Notes |
|------|---|---|
| Better Stack Logs | $50–200 | Pay per GB ingested; good for small teams. |
| Grafana Cloud (Prometheus + Loki) | $50–150 | Generous free tier; scales on data. |
| Datadog | $500–2000+ | Full APM + metrics; most expensive but most powerful. |
| Self-hosted Prometheus + Grafana | $0 (hosting) | Ops burden; suitable if you have SRE team. |

---

## Quick Reference Links

- Main SLO Framework: [production-slo-error-budget-framework.md](production-slo-error-budget-framework.md)
- Weekly Review Template: [slo-weekly-review-template.md](slo-weekly-review-template.md)
- Environment Config: [backend/.env.slo.example](../backend/.env.slo.example)
- SLI Logger Utility: [backend/utils/sliLogger.js](../backend/utils/sliLogger.js)
- Game Day Playbook (test SLOs): [production-game-day-playbook.md](production-game-day-playbook.md)

---

## Questions?

**For SLO/budget questions:** Refer to Part 3–4 of framework.  
**For implementation questions:** Check Part 6 (code snippets).  
**For weekly review questions:** Use template + Part 7 runbook.
