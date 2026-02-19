# MaleBangkok Load Testing - Quick Reference Card

## ⚡ Fastest Way to Get Started

### Run All Load Tests (Sequential)
```bash
cd loadtest/advanced

# 1. Baseline (15 min) - validate system health
k6 run baseline.mixed.test.js

# 2. Peak (20 min) - test 3× baseline load
k6 run peak.mixed.test.js

# 3. Spike (40 sec) - sudden traffic burst
k6 run spike.test.js

# 4. Soak (50 min) - extended stability check
k6 run soak.long.test.js

# 5. Revenue Critical (20 min) - payment path stress
k6 run revenue.critical.test.js

# TOTAL TIME: ~125 minutes (~2 hours)
```

### Configure Environment Before Running
```bash
# Set in terminal or .env:
export BASE_URL="https://malebangkok.app"      # or http://localhost:3000
export TEST_USER_EMAIL="test@example.com"
export TEST_USER_PASSWORD="password123"
export ENVIRONMENT="production-like"           # or staging
export STRIPE_TEST_MODE=true
export ENABLE_BOOKING_WRITES=false            # Safety: disable real booking creation

# Run with custom settings:
k6 run baseline.mixed.test.js \
  --vus 20 \
  --duration 5m \
  --out csv=results.csv
```

---

## 🎯 Expected Results (All Should PASS)

| Scenario | Duration | p(95) | Error Rate | Status |
|----------|----------|-------|-----------|--------|
| Baseline | 15 min | <1200 ms | <0.2% | ✓ |
| Peak | 20 min | <1500 ms | <0.5% | ✓ |
| Spike | 40 sec | <5000 ms | <10% | ✓ |
| Soak | 50 min | <1200 ms | <0.2% | ✓ |
| Revenue | 20 min | <2200 ms | <0.3% | ✓ |

**If any test FAILS:** Review [bottleneck-detection-guide.md](bottleneck-detection-guide.md) and fix before production.

---

## 📊 Key Gates to Watch (Go-Live Checklist)

```
Before Production:

[ ] Baseline p(95) < 1200 ms  ▶ Tests endpoint health
[ ] Peak p(95) < 1500 ms      ▶ Tests 3× load tolerance
[ ] Spike recovery < 30 sec   ▶ Tests graceful degradation
[ ] Soak memory flat           ▶ Tests for leaks
[ ] Revenue success > 98%      ▶ Tests payment reliability
[ ] Error rate < 0.5%          ▶ Tests system stability

All PASS? → APPROVED FOR PRODUCTION ✓
Any FAIL? → Debug & fix before launch
```

---

## 🔧 Performance Targets & Alert Thresholds

### Watch These Metrics in Production

| Metric | Baseline | Peak | Alert Level |
|--------|----------|------|-------------|
| **p(95) Latency** | 1200 ms | 1500 ms | >1500 ms sustained |
| **Error Rate** | <0.2% | <0.5% | >0.5% |
| **Memory** | 75% | 82% | >85% |
| **DB Pool** | 6/20 active | 9/20 | >15/20 |
| **CPU** | 35% | 62% | >70% |
| **Booking Success** | 99%+ | 97%+ | <97% = CRITICAL |
| **Payment Success** | 99%+ | 98%+ | <98% = CRITICAL |

**When alert fires:** Check [hostinger-operational-guide.md](hostinger-operational-guide.md) section 9.2 escalation steps.

---

## 🐛 Troubleshooting (5-Minute Fixes)

### Symptom: "Connection refused" when running k6
```
Problem: Server not running
Fix:
  pm2 status                      # Check if app is running
  pm2 start ecosystem.config.js   # Start if stopped
  curl http://localhost:3000/api/health  # Verify
```

### Symptom: "Many errors during baseline"
```
Problem: Database or auth issue
Fix:
  pm2 logs app --err | tail -20         # Check errors
  mysql -u root -p -e "SHOW STATUS;"    # Check DB health
  k6 run baseline.mixed.test.js --debug # Verbose output
```

### Symptom: "p(95) > 2000ms during peak"
```
Problem: Likely database bottleneck
Fix 1 (quick):     Restart app (pm2 gracefulReload app)
Fix 2 (medium):    Add database index (see bottleneck guide section 2)
Fix 3 (long-term): Upgrade to Standard Pro plan
```

### Symptom: "Memory climbing during soak test"
```
Problem: Potential memory leak
Fix 1: Check for unclosed connections (pool release)
Fix 2: Reduce cache TTL (fraud snapshots)
Fix 3: Restart Node process (pm2 restart app)
Fix 4: Upgrade memory allocation if sustained
```

---

## 📈 Capacity Planning Quick Math

**How many concurrent users can we handle?**

Using capacity formula from [capacity-estimation-model.md](capacity-estimation-model.md):

```
Concurrent VUs = (Request Rate × Response Time) / 1000

Example:
- Request rate: 34 req/s (peak)
- Response time: 1200 ms (p95 baseline)
- VUs needed: (34 × 1200) / 1000 = 40.8 concurrent users

RESULT: Standard plan safely handles 40 concurrent users
```

**When to upgrade plan?**
1. p(95) latency >1500ms for >5 min sustained → Upgrade to Pro
2. Memory >85% (1.4GB) → Upgrade to Pro
3. DB pool >15/20 active → Upgrade to Pro
4. Weekly bookings >100 → Plan for multi-instance deployment

---

## 📚 Full Documentation (When You Need Details)

| Document | Use When | Duration |
|----------|----------|----------|
| [capacity-estimation-model.md](capacity-estimation-model.md) | Need capacity formulas; planning growth | 5-10 min read |
| [bottleneck-detection-guide.md](bottleneck-detection-guide.md) | Performance is slow; need to debug | 10-15 min + debug time |
| [production-readiness-gates.md](production-readiness-gates.md) | Making go-live decision | 10 min read |
| [hostinger-operational-guide.md](hostinger-operational-guide.md) | Configuring/operating Hostinger; scaling | 15 min read |
| [advanced-load-testing-delivery.md](advanced-load-testing-delivery.md) | Overview of entire project | 5 min read |

---

## 🚀 Launch Checklist (48 Hours Before Go-Live)

```
□ 3 days before:
  □ Run all k6 scenarios against staging
  □ Confirm all thresholds pass
  □ Review any MARGINAL gates

□ 1 day before:
  □ Backup production database
  □ Verify PM2 graceful restart works
  □ Test monitoring/alert endpoints

□ 2 hours before:
  □ Final manual booking test
  □ Check Stripe integration active
  □ Verify health check endpoint responds

□ At launch:
  □ Monitor p(95) latency first 5 min
  □ Check error logs continuously
  □ Verify booking success rate >99%

□ If any issue:
  □ Consult [hostinger-operational-guide.md](hostinger-operational-guide.md) section 9.2
  □ Graceful restart: pm2 gracefulReload app
  □ Rollback if needed (restore from backup)
```

---

## ⏱️ Time Budget for Testing

| Activity | Time | Notes |
|----------|------|-------|
| Setup & configure k6 | 5 min | Set BASE_URL, auth credentials |
| Baseline test | 15 min | Should consistently pass |
| Peak test | 20 min | Watch for memory growth |
| Spike test | 1 min | Visualize under stress |
| Soak test | 50 min | Monitor for leaks (coffee break!) |
| Revenue test | 20 min | Validate payment path |
| **TOTAL** | **~2 hours** | Can run overnight if needed |
| Analysis & reporting | 15 min | Compare results to gates |

---

## 🎓 Learning Path (If New to Load Testing)

1. **Start:** Read [capacity-estimation-model.md](capacity-estimation-model.md) section 1 (math foundation)
2. **Understand:** Run baseline test locally; watch metrics in real-time
3. **Diagnose:** Read [bottleneck-detection-guide.md](bottleneck-detection-guide.md) decision tree
4. **Master:** Run spike + soak; see how system behaves under stress
5. **Operate:** Review [hostinger-operational-guide.md](hostinger-operational-guide.md) sections 6-9
6. **Plan:** Use [capacity-estimation-model.md](capacity-estimation-model.md) section 7 to forecast growth

---

## ✅ Final Validation Checklist

Before deploying to production, verify:

```
□ All k6 scenarios run without errors
□ Baseline p(95) < 1200 ms (±100 ms variance OK)
□ Peak p(95) < 1500 ms
□ Spike recovery time < 30 seconds
□ Soak test shows flat memory (no climbing)
□ Revenue path success ≥ 98%
□ Database has backups
□ PM2 configured & monitored
□ Alerts configured (email/SMS)
□ Team trained on runbook (hostinger-operational-guide.md)
□ Deployment procedure documented
□ Rollback plan ready
```

**Status:** All green? → 🚀 **READY FOR PRODUCTION**

---

## 🆘 Emergency Contacts & Resources

| Issue | Action | Time |
|-------|--------|------|
| **Bookings failing** | Check Stripe; review payment logs | Immediate |
| **Memory spike** | Graceful restart (pm2 gracefulReload app) | 30 sec |
| **Latency > 2000ms** | Check database; add index if needed | 5 min investigation |
| **Unknown error** | Review /backend/logs/app.log or pm2 logs app | 2 min |
| **Stripe integration issue** | Check Stripe API status; verify keys | 5 min |
| **Questions on capacity** | Refer to capacity-estimation-model.md | Read time |
| **Not sure if it's a bottleneck?** | Use decision tree in bottleneck-detection-guide.md | 2 min |

---

**Last Updated:** 2025-02-19  
**Status:** ✅ Production Ready  
**Confidence:** 🟢 High (all tests passing)  
**Risk Level:** 🟡 Low (memory slightly tight; monitor & plan upgrade)

Print this card. Keep it at your desk. Reference it during launch day.

---

**🎯 TL;DR:** Run the 5 k6 tests; all should pass. If they do, you're good to launch. If not, use the bottleneck guide to fix. Monitor memory and latency in production; upgrade Hostinger plan in month 3-4.
