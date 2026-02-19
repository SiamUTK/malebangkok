# k6 Load Testing Suite — MaleBangkok API

Complete production-grade load testing suite for the MaleBangkok Express API.

---

## Installation

### macOS

```bash
brew install k6
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6-stable.list
sudo apt-get update
sudo apt-get install k6
```

### Windows

**Option 1: Chocolatey**
```powershell
choco install k6
```

**Option 2: Direct Binary**
Download from: https://github.com/grafana/k6/releases

**Option 3: WSL (easiest)**
```bash
# In WSL Ubuntu terminal:
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com --recv-keys C5AD17C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6-stable.list
sudo apt-get update
sudo apt-get install k6
```

### Verify Installation

```bash
k6 version
# Should output: k6 vX.XX.X
```

---

## Environment Setup

### Production URL (Live)

```bash
k6 run smoke.test.js --env BASE_URL=https://malebangkok.com
```

### Local Development URL

```bash
k6 run smoke.test.js --env BASE_URL=http://localhost:3000
```

### Staging URL

```bash
k6 run load.test.js --env BASE_URL=https://staging.malebangkok.com
```

---

## TEST SUITE COMMANDS

### 1. SMOKE TEST (Quick Health Check)

**What it does:**
- 1 virtual user
- 30 seconds total
- Hits `/api/health` and `/api/guides`
- Fast feedback on API availability

**Run locally:**
```bash
k6 run loadtest/smoke.test.js --env BASE_URL=http://localhost:3000
```

**Run against production:**
```bash
k6 run loadtest/smoke.test.js --env BASE_URL=https://malebangkok.com
```

**PASS Criteria:**
- ✓ All requests return HTTP 200
- ✓ p95 response time < 1000ms
- ✓ Error rate < 0.1%
- ✓ All checks pass (database field present, arrays returned)

**Expected runtime:** ~45 seconds

---

### 2. LOAD TEST (Normal Traffic Simulation)

**What it does:**
- Ramps from 0 → 10 → 50 VUs
- Holds at 50 VUs for 2 minutes
- Ramps down to 0
- Realistic traffic mix (70% guides, 20% health, 10% matching)

**Run locally:**
```bash
k6 run loadtest/load.test.js --env BASE_URL=http://localhost:3000
```

**Run against production:**
```bash
k6 run loadtest/load.test.js --env BASE_URL=https://malebangkok.com
```

**PASS Criteria:**
- ✓ p95 response time < 800ms
- ✓ p99 response time < 1500ms
- ✓ Error rate < 1% (< 50 errors in 5000 requests)
- ✓ No timeouts or connection errors
- ✓ Database stays connected (health check)

**Expected runtime:** ~7 minutes

---

### 3. STRESS TEST (Find Breaking Point)

**What it does:**
- Ramps from 0 VUs in 1-minute steps
- Targets: 50 → 100 → 150 → 200 → 250 VUs
- Identifies where performance degrades
- Tests breaking point behavior

**Run locally:**
```bash
k6 run loadtest/stress.test.js --env BASE_URL=http://localhost:3000
```

**Run against production:**
```bash
k6 run loadtest/stress.test.js --env BASE_URL=https://malebangkok.com
```

**PASS Criteria (Conservative):**
- ✓ Survives up to 150 VUs without 500 errors
- ✓ Error rate < 5% after 150 VUs is acceptable
- ✓ p95 response time degrades gracefully (< 3000ms)
- ✓ No complete crashes

**Success Indicators:**
- API handles 100+ concurrent users smoothly
- Error rate increases gradually, not suddenly
- No connection pool exhaustion errors

**Expected runtime:** ~6 minutes

---

### 4. SOAK TEST (Memory Leak Detector)

**What it does:**
- Steady 20 VUs for 30 minutes
- Continuous realistic load
- Detects memory leaks, connection leaks, performance degradation

**Run locally:**
```bash
k6 run loadtest/soak.test.js --env BASE_URL=http://localhost:3000
```

**Run against production:**
```bash
k6 run loadtest/soak.test.js --env BASE_URL=https://malebangkok.com
```

**PASS Criteria:**
- ✓ p95 response time remains < 1000ms throughout entire duration
- ✓ Error rate stays < 1% (no degradation over time)
- ✓ Database connection remains healthy (health checks pass)
- ✓ Memory usage in Hostinger dashboard stays stable
- ✓ No gradual slowdown (compare first 5 min vs last 5 min)

**What to Monitor (Hostinger Panel):**
- Server CPU usage (should not spike above 80%)
- Memory usage (should not increase linearly)
- Database connection count (should remain stable)
- Disk I/O (should be normal)

**Expected runtime:** ~40 minutes

---

## Running All Tests (Sequential)

```bash
# Full test suite against production
k6 run loadtest/smoke.test.js --env BASE_URL=https://malebangkok.com && \
k6 run loadtest/load.test.js --env BASE_URL=https://malebangkok.com && \
k6 run loadtest/stress.test.js --env BASE_URL=https://malebangkok.com && \
k6 run loadtest/soak.test.js --env BASE_URL=https://malebangkok.com
```

**Total runtime:** ~53 minutes (1 hour)

---

## Output & Metrics Explanation

### Sample Output:

```
✗ http_req_duration.p(95) <= 800
  threshold has been exceeded
  value: 825ms
```

**What this means:**
- 95% of requests completed in <= 825ms
- Threshold was 800ms, so it failed by 25ms
- This is close to acceptable; monitor for consistent violations

### Common Thresholds:

| Metric | Threshold | Meaning |
|---------|-----------|---------|
| `http_req_duration p(95)` | < 800ms | 95% of requests finish in 800ms or less |
| `http_req_duration p(99)` | < 1500ms | 99% of requests finish in 1.5s or less |
| `http_req_failed` | < 1% | Less than 1% error rate overall |

---

## Production Checklist Before Load Testing

Before running against production, ensure:

- [ ] Production database is backed up
- [ ] Monitoring is active (CPU, memory, disk, DB connections)
- [ ] Log aggregation is running (Winston logs accessible)
- [ ] Team is aware test is running
- [ ] Load test scheduled during acceptable hours (low traffic)
- [ ] Test runs from a machine with stable network
- [ ] API keys/secrets in .env are secure and not logged
- [ ] Health check endpoint is accessible without auth

---

## Interpreting Results

### Smoke Test Results:
- **PASS = API is reachable and basic health is OK**
- If it fails, API is down or misconfigured
- Proceed to load test only if smoke test passes

### Load Test Results:
- **PASS = Normal production load is handled correctly**
- If p95 > 800ms consistently, consider optimization
- If error rate > 1%, identify failing endpoint

### Stress Test Results:
- **PASS = Handles 150+ VUs without cascading failure**
- Slow degradation is OK (errors increase gradually)
- Sudden spike in errors = bottleneck found
- Note the VU count where error rate exceeds 5%

### Soak Test Results:
- **PASS = No memory leaks, no degradation over time**
- If p95 increases from hour 1 to hour 3, memory leak likely
- If error rate increases over time, connection leak likely
- Compare first 10 min vs last 10 min metrics

---

## Troubleshooting

### Test times out connecting to production
```bash
# Add timeout flag
k6 run smoke.test.js --env BASE_URL=https://malebangkok.com --timeout 30s
```

### Need more verbose output
```bash
# Show full HTTP response bodies in errors
k6 run smoke.test.js -v --env BASE_URL=https://malebangkok.com
```

### Test from behind corporate proxy
```bash
# Configure proxy
k6 run smoke.test.js --env BASE_URL=https://malebangkok.com --http-debug
```

### Local API not responding
```bash
# Check if backend is running
curl http://localhost:3000/api/health

# Restart backend
npm start
```

---

## Integration with CI/CD

### GitHub Actions Example:

```yaml
name: Load Test

on:
  schedule:
    - cron: '0 3 * * 0'  # Weekly at 3 AM UTC

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run k6 smoke test
        run: |
          wget -q -O- https://dl.k6.io/release/deb/key.gpg | sudo apt-key add -
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6-stable.list
          sudo apt-get update
          sudo apt-get install -y k6
          k6 run loadtest/smoke.test.js --env BASE_URL=${{ secrets.PROD_URL }}
```

---

## Performance Standards (MaleBangkok)

Based on industry best practices for tour guide APIs:

| Scenario | VUs | Target p95 | Target p99 | Max Error Rate |
|----------|-----|-----------|-----------|----------------|
| Smoke (health check) | 1 | < 500ms | < 1000ms | < 0.1% |
| Normal load (daily traffic) | 50 | < 800ms | < 1500ms | < 1% |
| Peak hour traffic | 150 | < 1500ms | < 3000ms | < 2% |
| Breaking point | 250+ | Graceful degradation | N/A | < 5% acceptable |

---

## Next Steps

1. Run smoke test on production (verify connectivity)
2. Run load test on staging first, then production
3. If stress test finds bottleneck:
   - Identify failing endpoint (check k6 output tags)
   - Review database queries (slow guide list?)
   - Add caching or optimize matching algorithm
   - Re-run stress test to verify improvement
4. Run soak test over a weekend to monitor overnight
5. Keep load test results in git for trending

---

## Documentation References

- k6 Official: https://k6.io/docs/
- k6 API: https://k6.io/docs/javascript-api/
- k6 Thresholds: https://k6.io/docs/using-k6/thresholds/
- k6 Groups: https://k6.io/docs/using-k6/grouping-and-tagging/
