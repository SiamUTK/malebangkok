# Performance Interpretation Guide — MaleBangkok API

Professional guide for understanding k6 load test results and making production decisions.

---

## Key Metrics Explained

### 1. Response Time (Latency)

**What is p95 latency?**

p95 means "95th percentile" — if you sorted all response times from fastest to slowest, p95 is the time at the 95% mark.

**Example:**
- 1000 requests tested
- Sorted by speed: 50ms, 60ms, ... 800ms, 801ms, ... 5000ms
- p95 = 800ms (950th request out of 1000)
- This means: 95% of users experienced ≤ 800ms latency

**Why p95 matters:**
- Tells you how slow the MAJORITY of users experience your API
- p95 = 1000ms means 5% of requests take longer than 1 second
- Better than average because average can be skewed by slow outliers

**Production Standards for Tour Guide API:**
- **Excellent:** p95 < 500ms (nearly instant)
- **Good:** p95 < 800ms (feels fast for most)
- **Acceptable:** p95 < 1500ms (noticeable but tolerable)
- **Poor:** p95 > 2000ms (users notice lag, may retry)

---

### 2. Error Rate (Failed Requests)

**What is error rate?**

Percentage of requests that return HTTP status >= 400.

```
Error Rate = (Failed Requests / Total Requests) × 100
```

**Example:**
- 5000 requests sent
- 50 returned HTTP 500 (server error)
- Error rate = 50/5000 = 1%

**Production Standards:**
- **Excellent:** < 0.1% (1 error per 1000 requests)
- **Good:** < 1% (1 error per 100 requests)
- **Acceptable in short burst:** < 5% (only during stress test)
- **Unacceptable:** > 5% in normal load

**What causes high error rates:**
- Database connection limit reached
- Out of memory
- Misconfigured rate limiters
- Backend crashed or not responding
- Network issues

---

### 3. Throughput (Requests Per Second)

**What is RPS (Requests Per Second)?**

How many requests the server successfully completes per second.

**Example k6 output:**
```
http_reqs....................: 2500    89.285834/s
```

This means: 2500 total requests, averaging 89 requests per second.

**Production Standards:**
- **Excellent:** > 100 RPS at p95 < 800ms
- **Good:** > 50 RPS at p95 < 800ms
- **Acceptable:** > 25 RPS at p95 < 800ms

**How to calculate expected capacity:**

```
Expected RPS = (Number of VUs) × (Requests per VU per minute) / 60
```

If 50 users each make 12 requests per minute:
- RPS = 50 × 12 / 60 = 10 RPS sustained

---

### 4. Connection Metrics

**http_req_connecting (time to establish connection):**
- Should be < 10ms in production
- If > 50ms, network latency or server slowness

**http_req_tls_handshaking (HTTPS negotiation):**
- Should be < 100ms
- If > 500ms, potential TLS certificate issue

**http_req_waiting (backend processing time):**
- Most important metric
- Should be < 800ms for p95
- If this is slow, backend is the bottleneck

---

## Reading k6 Output

### Sample Output:

```
     data_received..................: 15 MB   26 KB/s
     data_sent......................: 1.2 MB  2.3 KB/s
     http_req_blocked...............: avg=2.34ms  min=1.24ms  med=2.15ms  max=45.32ms
     http_req_connecting............: avg=1.25ms  min=0.89ms  med=1.10ms  max=3.44ms
     http_req_duration..............: avg=245.12ms min=50.21ms med=200.32ms max=1500.23ms p(90)=356.23ms p(95)=498.23ms p(99)=1234.23ms
     http_req_failed................: 0.23%
     http_req_receiving.............: avg=12.32ms  min=5.32ms  med=11.44ms  max=123.45ms
     http_req_sending...............: avg=3.21ms   min=2.10ms  med=3.00ms   max=25.43ms
     http_req_tls_handshaking.......: avg=0ms      min=0ms     med=0ms      max=0ms
     http_req_waiting...............: avg=230.21ms min=45.21ms med=190.21ms max=1400.23ms
     http_reqs......................: 5000     89.285834/s
     iteration_duration.............: avg=3.30s    min=3.00s   med=3.15s    max=5.21s
     iterations.....................: 500      8.928583/s
     vus............................: 50
     vus_max........................: 50
```

**Breakdown:**

| Metric | Value | Interpretation |
|--------|-------|-----------------|
| http_req_duration p(95) | 498ms | 95% of requests ≤ 498ms ✓ |
| http_req_failed | 0.23% | 23 errors per 10,000 requests ✓ |
| http_req_waiting | 230ms avg | Backend processing is fast ✓ |
| http_reqs | 5000 total | Completed 5000 requests ✓ |
| iteration_duration | 3.30s avg | Each VU iteration takes 3.3s |

---

## When to Scale Up

### RED FLAGS (Scale Immediately):

1. **p95 response time > 2000ms**
   - Users experiencing significant lag
   - Risk of cascading failures
   - Action: Add server capacity or optimize code

2. **Error rate > 5%**
   - Significant number of failures
   - Users getting 500 errors
   - Action: Investigate backend logs, check database

3. **Error rate increasing over time in soak test**
   - Memory leak or connection leak likely
   - Action: Profile memory, check for unclosed connections

4. **Stress test breaks at < 100 VUs**
   - API cannot handle moderate concurrent load
   - Action: Optimize hot path, add caching, scale horizontally

### YELLOW FLAGS (Plan to Scale):

1. **p95 response time 800-1500ms**
   - Users notice lag but API functional
   - Action: Profile and optimize, plan scaling

2. **p95 increasing from smoke → load test**
   - API degrades as load increases
   - Action: Find bottleneck (DB? code?)

3. **Error rate 1-3% at 50 VUs**
   - Some failures under moderate load
   - Action: Fix rate limiting or add resources

4. **CPU or memory at 70%+ during load test**
   - Hostinger dashboard shows high utilization
   - Action: Upgrade server plan

---

## When the API is Production-Ready

✓ **All of the following must be true:**

- [ ] **Smoke Test PASSES**
  - `/api/health` returns 200 in < 500ms
  - `/api/guides` returns 200 in < 1000ms

- [ ] **Load Test PASSES**
  - 50 VUs for 2 minutes
  - p95 response time < 800ms
  - Error rate < 1%
  - No 500 errors

- [ ] **Stress Test PASSES**
  - Handles 150 VUs without cascading failures
  - Error rate < 5% at 150 VUs
  - p95 doesn't exceed 2000ms

- [ ] **Soak Test PASSES**
  - 20 VUs for 30 minutes
  - p95 remains < 1000ms throughout
  - Error rate stays < 1%
  - No memory leaks (memory usage stable)
  - Database connection healthy

- [ ] **Production Environment Ready**
  - Monitoring active (CPU, memory, disk, DB)
  - Error alerting configured
  - Database backups automated
  - Log aggregation running
  - HTTPS certificate valid
  - Rate limiting working

**If all above pass → API is production-ready.**

---

## Common Bottlenecks & Solutions

### Bottleneck: High Response Time (p95 > 1000ms)

**Diagnosis:**
```bash
k6 run load.test.js -v --env BASE_URL=https://malebangkok.com 2>&1 | grep "guides_list"
```

**Root causes:**

1. **Slow Database Query**
   - k6 shows high `http_req_waiting`
   - Solution: Add database indexes, optimize SELECT queries
   - Test via: `mysql> EXPLAIN SELECT * FROM guides;`

2. **Memory Swap/GC Pause**
   - Hostinger dashboard shows memory at 100%
   - Solution: Upgrade server RAM or optimize code
   - Monitor via Node.js heap snapshots

3. **Unoptimized Matching Algorithm**
   - POST `/guides/match` is slowest endpoint
   - Solution: Add in-memory cache or limit search scope
   - Test locally with large guide list

---

### Bottleneck: High Error Rate (> 1%)

**Diagnosis:**
```bash
k6 run load.test.js --env BASE_URL=https://malebangkok.com 2>&1 | grep "http_req_failed"
```

**Root causes:**

1. **Rate Limiter Too Strict**
   - 429 errors appearing in k6 output
   - Solution: Increase rate limit thresholds in `rateLimiter.js`

2. **Database Connection Pool Exhausted**
   - MySQL "too many connections" error
   - Solution: Increase `connectionLimit` in `config/db.js`

3. **Backend Crash**
   - 502/503 errors in k6 output
   - Solution: Check server logs in Hostinger, restart app

4. **JWT Token Issues**
   - 401 errors on non-auth endpoints
   - Solution: Check if token is being passed correctly

---

### Bottleneck: Memory Usage Grows in Soak Test

**Diagnosis:**
- Hostinger memory dashboard shows linear increase over 30 min
- p95 latency increases from hour 1 to hour 3

**Root causes:**

1. **Response Body Not Drained**
   ```javascript
   // BAD - k6 will accumulate body in memory
   const res = http.get(url);
   
   // GOOD - explicitly handle or skip body
   const res = http.get(url, { responseType: 'none' });
   ```

2. **Event Listener Leak**
   - `res.on('data')` without `removeListener()`
   - Solution: Review event handler cleanup

3. **Connection Pool Not Releasing**
   - MySQL connections not being returned
   - Solution: Check `db.js` finally blocks

---

## Capacity Planning Formula

**To handle X concurrent users:**

```
Required RPS = X users × (average requests per user per minute) / 60

Example:
- 1000 concurrent users
- Each user makes 12 API calls per minute (1 every 5 seconds)
- Required RPS = 1000 × 12 / 60 = 200 RPS

Use stress test to find at what VU count you hit 5% error rate.
If stress test breaks at 200 VUs, you can handle ~200 concurrent users.
```

**To scale for growth:**
1. Project user growth: 1,000 → 5,000 → 10,000 users
2. Calculate required RPS for each milestone
3. Run stress test to find breaking point at each stage
4. Plan infrastructure upgrades before hitting 80% capacity

---

## Load Testing Best Practices

### ✓ DO:

- ✓ Run tests at consistent times (compare apples to apples)
- ✓ Test from stable network (home WiFi will skew results)
- ✓ Monitor server metrics during test (CPU, RAM, disk)
- ✓ Run load test weekly to catch regressions
- ✓ Test before deploying major features
- ✓ Keep test results in git for trending

### ✗ DON'T:

- ✗ Run soak test during business hours (60% CPU impact)
- ✗ Test from random cloud providers (latency varies)
- ✗ Make code changes between test runs (results won't compare)
- ✗ Use production data for load testing (privacy risk)
- ✗ Ignore red flags (performance debt compounds)

---

## Production Monitoring Post-Launch

After deploying to production, monitor these metrics:

| Metric | Frequency | Alert If |
|--------|-----------|----------|
| Error Rate | Real-time | > 1% for 5 minutes |
| p95 Response Time | 5-min rolling | > 1000ms for 15 minutes |
| Database Connections | Every minute | > 80% of pool limit |
| Server Memory | Every minute | > 85% of available |
| CPU Usage | Every minute | > 80% for > 10 minutes |
| Disk Usage | Hourly | > 85% |

**Alert recipients:** DevOps team, on-call engineer

---

## Escalation Procedure

**If production is degrading:**

1. **Check error logs immediately**
   ```bash
   # In Hostinger, last 100 errors
   tail -100 backend/logs/error.log
   ```

2. **Run smoke test to confirm issue**
   ```bash
   k6 run loadtest/smoke.test.js --env BASE_URL=https://malebangkok.com
   ```

3. **Check server status**
   - CPU: Should be < 70%
   - Memory: Should be < 80%
   - Database connections: Should be < 10

4. **Take action**
   - If rate limit causing errors: Increase limit in env vars
   - If database slow: Check active connections, kill long queries
   - If memory high: Restart application (graceful shutdown)
   - If CPU high: Profile code for hot spot, optimize, re-deploy

5. **Re-test**
   - After fix, re-run smoke test
   - Monitor for 30 minutes
   - If resolved, post incident report

---

## Trending & Regression Detection

Save k6 results over time to detect regressions:

```bash
# Save test results with timestamp
k6 run loadtest/load.test.js --env BASE_URL=https://malebangkok.com \
  -o csv=results/load-test-$(date +%Y%m%d-%H%M%S).csv
```

**Compare over time:**
- Week 1: p95 = 650ms, error rate = 0.2%
- Week 2: p95 = 680ms, error rate = 0.3%  ← Slight degradation
- Week 3: p95 = 750ms, error rate = 0.8%  ← Significant regression

**Action:** Investigate code changes from Week 2→3, likely found regression.

---

## Summary Decision Tree

```
Load Test Results
│
├─ All thresholds pass? 
│  ├─ YES → Production Ready ✓
│  └─ NO → Next check
│
├─ p95 response time too high?
│  ├─ YES → Optimize database queries or caching
│  └─ NO → Next check
│
├─ Error rate > 1%?
│  ├─ YES → Check rate limiting, DB connections, or backend
│  └─ NO → Next check
│
├─ Stress test breaks at < 100 VUs?
│  ├─ YES → Code optimization needed
│  └─ NO → Scale considerations
│
└─ Soak test shows degradation?
   ├─ YES → Memory or connection leak (profile backend)
   └─ NO → Production Ready ✓
```

---

**Last Updated:** February 19, 2026  
**Testing Framework:** k6 v0.50.0+ (Grafana k6)  
**Production Target:** 150 concurrent users, p95 < 800ms
