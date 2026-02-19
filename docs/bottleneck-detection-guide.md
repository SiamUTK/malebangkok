# Bottleneck Detection Guide - MaleBangkok Load Analysis

## Overview
When performance degrades in production, identify the root cause quickly using this structured diagnostic approach. Each bottleneck has distinct symptoms, metric patterns, and remediation steps.

---

## 1. CPU Bottleneck (Event Loop Saturation)

### Symptoms
- p(95) latency increasing steadily even at constant user load
- Error rate rising without connection pool exhaustion
- Response time for **all endpoints** degrading equally (not isolated to one service)
- Node.js process consistently at 95%+ CPU across all cores

### Metrics to Inspect

**Primary Evidence:**
```
Node.js CPU Utilization: > 85% sustained
Event Loop Lag: > 50ms (measure via setImmediate() callback delay)
Throughput: Plateauing (more VUs don't increase req/s, just latency)
```

**Check in production dashboard:**
```javascript
// Node.js built-in metric
setImmediate(() => {
  const lag = Date.now() - startMs;  // Should be <5ms healthy
  if (lag > 50) console.warn('Event loop lagging', lag);
});
```

**k6 comparison:**
- Baseline: p(95) = 1,200ms at 13 VUs
- Same endpoint at 20 VUs: p(95) = 2,000ms (67% increase)
- **Pattern:** Latency scaling worse than linear with user count = CPU bound

### Root Causes
1. **Inefficient endpoint logic** (e.g., synchronous crypto operations, unoptimized regex)
2. **Insufficient Node.js worker threads** for CPU-heavy tasks
3. **Too many concurrent connections** for handler pool
4. **Polling loops or busy-waiting code**

### Diagnosis Steps
1. Enable CPU profiling:
   ```bash
   node --prof server.js
   # Run load test for 2 minutes
   # node --prof-process isolate-*.log > cpu-profile.txt
   ```
2. Check for hot functions in CPU profile
3. Look for synchronous operations in hot paths:
   ```bash
   grep -n "crypto\." backend/services/*.js
   grep -n "JSON.stringify" backend/controllers/*.js --max-count=5
   ```
4. Measure event loop lag in production (add middleware):
   ```javascript
   app.use((req, res, next) => {
     const startLag = Date.now();
     setImmediate(() => {
       const lag = Date.now() - startLag;
       if (lag > 50) console.warn(`Event loop lag: ${lag}ms`);
       next();
     });
   });
   ```

### Remediation
1. **Async-first refactoring** — convert sync operations to async
2. **Worker threads** — offload crypto to node:worker_threads
3. **Caching** — reduce repeated CPU-heavy calculations (memoization)
4. **Compression** — disable gzip for small payloads; use brotli for larger ones
5. **Reduce WHAT is sent** — paginate guide lists, filter API responses early

**Quick win:** Check for `JSON.stringify()` on entire booking objects. Should serialize only required fields.

---

## 2. Database Bottleneck (Connection Pool Exhaustion)

### Symptoms
- p(95) latency spikes sharply at specific user count (~40 VUs in our case)
- Error rate elevated (connection timeout errors in logs)
- **Only database-dependent endpoints** are slow (booking, payment intent, guide match)
- Health check endpoint (no DB) remains fast (<100ms)
- Connection pool monitoring shows: active ≈ max pool size (20/20)

### Metrics to Inspect

**Primary Evidence:**
```
DB Active Connections: 18-20 / 20 (pool exhausted)
DB Queue Length: 5+ waiting queries
Query p(95) latency: > 500ms (queries once they start)
```

**MySQL slow query log (query duration >1s):**
```sql
SELECT * FROM bookings b 
  LEFT JOIN payments p ON ...
  WHERE b.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
  AND NOT EXISTS (SELECT 1 FROM guide_stats ...);
  -- Duration: 2.3s (unindexed join!)
```

**k6 pattern:**
- Booking creation time stable at 10 VUs (p95 = 600ms)
- At 35 VUs: p95 = 2,200ms (connection wait time)
- Error: "ENOMEM: Cannot acquire more connections"

### Root Causes
1. **Missing indexes** on frequently queried columns
2. **Slow queries** (full table scans, cartesian products)
3. **Locks held too long** (long-running transactions)
4. **N+1 query pattern** (fetch guide, then fetch reviews in loop)
5. **Pool size too small** for concurrent load

### Diagnosis Steps

1. **Check pool size configuration:**
   ```javascript
   // backend/config/db.js
   const pool = mysql.createPool({
     connectionLimit: 20,  // <= This value
     waitForConnections: true,
     queueLimit: 0,
   });
   ```

2. **Enable MySQL slow query log (docker/hostinger):**
   ```sql
   SET GLOBAL slow_query_log = ON;
   SET GLOBAL long_query_time = 1;  -- log queries > 1 second
   SHOW PROCESSLIST;  -- see hanging queries
   ```

3. **Identify slow queries:**
   ```bash
   # SSH into server
   tail -f /var/log/mysql/slow.log | head -20
   ```

4. **Check for N+1 pattern in controllers:**
   ```bash
   grep -n "db.query.*for\|forEach.*db.query" backend/controllers/*.js
   ```

5. **Run EXPLAIN on suspicious queries:**
   ```sql
   EXPLAIN SELECT * FROM bookings b 
     LEFT JOIN payments p ON b.payment_id = p.id
     WHERE b.guide_id = 123;  -- Check: is guide_id indexed?
   ```

### Remediation

**Tier 1 (Immediate - no code changes):**
1. Increase pool size to 30-40:
   ```javascript
   connectionLimit: Math.min(40, maxConnections),
   ```
   Cost: +memory, +connection overhead; acceptable up to 50

2. Add indexes on frequently filtered columns:
   ```sql
   CREATE INDEX idx_bookings_guide_id ON bookings(guide_id);
   CREATE INDEX idx_bookings_payment_id ON bookings(payment_id);
   CREATE INDEX idx_payments_stripe_intent_id ON payments(stripe_intent_id);
   CREATE INDEX idx_payment_reconciliation_run_id ON payment_reconciliation_reports(run_id);
   ```

3. Enable query caching (Redis):
   ```javascript
   // Cache booking-by-id for 30 seconds
   async function getBooking(id) {
     const cached = await cache.get(`booking:${id}`);
     if (cached) return JSON.parse(cached);
     const booking = await db.query('SELECT * FROM bookings WHERE id = ?', [id]);
     cache.setex(`booking:${id}`, 30, JSON.stringify(booking[0]));
     return booking[0];
   }
   ```

**Tier 2 (Moderate refactoring):**
1. Batch N+1 queries:
   ```javascript
   // OLD: N+1
   const bookings = await db.query('SELECT * FROM bookings WHERE guide_id = ?', [guideId]);
   for (const booking of bookings) {
     const payment = await db.query('SELECT * FROM payments WHERE id = ?', [booking.payment_id]);
     booking.payment = payment[0];
   }
   
   // NEW: Single query with JOIN
   const bookings = await db.query(`
     SELECT b.*, p.* FROM bookings b
     LEFT JOIN payments p ON b.payment_id = p.id
     WHERE b.guide_id = ? ORDER BY b.created_at DESC
   `, [guideId]);
   ```

2. Implement connection pooling client upgrade (if available):
   - PgBouncer (PostgreSQL) or ProxySQL (MySQL) — front-end pooling to multiplex connections

**Tier 3 (Architectural):**
1. Read replicas for read-heavy queries (analytics, reconciliation)
2. Dedicated database server (separate from Node.js)
3. Upgrade DB instance size

---

## 3. Redis Bottleneck (Cache/Queue Contention)

### Symptoms
- Fraud detection cache misses causing delays (~100ms per failed cache lookup)
- Queue job processing backing up (jobs waiting 30+ seconds)
- Memory usage climbing (>80% of Redis allocation)
- BullMQ job completion times degrading

### Metrics to Inspect

**Primary Evidence:**
```
Redis Memory: > 180MB (target 200MB for full capacity)
Redis commands/sec: > 30,000 (peak for 2-core instance)
Cache hit ratio: < 80% (target 90%+)
Queue jobs pending: 100+ (should drain within 5 min)
```

**k6 pattern:**
- Payment intent creation latency varies 500-2000ms (redis inconsistency)
- Spike test shows queueing behavior (jobs wait 30s to start processing)

### Root Causes
1. **Eviction policy removing needed keys** — set to `allkeys-lru` but need `volatile-lru`
2. **Large job objects** in queue — 50KB per job = 1M jobs × 50KB = 50GB!
3. **No job cleanup** — jobs stay in completed/failed sets indefinitely
4. **Blocking operations** on main thread (fraud detection waiting for cache)
5. **Key collision** — multiple services using same Redis instance without namespacing

### Diagnosis Steps

1. **Check Redis memory usage:**
   ```bash
   redis-cli INFO memory
   # Output: used_memory_human:156M, maxmemory:256M
   ```

2. **View eviction policy:**
   ```bash
   redis-cli CONFIG GET maxmemory-policy
   # Output: allkeys-lru (problematic; evicts job keys!)
   ```

3. **Check queue backlog:**
   ```bash
   redis-cli LLEN bull:guide.performance.v1:wait
   redis-cli LLEN bull:guide.performance.v1:active
   redis-cli HLEN bull:guide.performance.v1:jobs
   ```

4. **Monitor command frequency:**
   ```bash
   redis-cli MONITOR | head -100 | sort | uniq -c | sort -rn
   # Shows which commands are spamming
   ```

5. **List largest keys:**
   ```bash
   redis-cli --bigkeys  # Scans Redis for large keys
   ```

### Remediation

**Tier 1 (Configuration):**
1. Set correct eviction policy **for cache vs queue separation**:
   ```bash
   # Option A: Use separate Redis instances (recommended)
   # Cache Redis: volatility-lru (evict old cache)
   # Queue Redis: allkeys-lru (don't evict jobs!)
   
   # Option B: Single instance — use volatile-lru
   redis-cli CONFIG SET maxmemory-policy volatile-lru
   # Then set TTL on all cache keys (fraud snapshots already do this)
   ```

2. Reduce queue job memory footprint:
   ```javascript
   // OLD: 50KB per job
   const jobData = {
     entireBookingObject,
     entireUserObject,
     entirePaymentObject,
   };
   
   // NEW: 5KB per job (just IDs)
   const jobData = {
     bookingId: 12345,
     userId: 999,
     paymentId: 888,
   };
   // Fetch full objects inside worker from DB
   ```

3. Auto-cleanup completed jobs (already in config/queue.js):
   ```javascript
   removeOnComplete: 1000,     // Keep 1000 most recent
   removeOnFail: 5000,         // Keep 5000 failed for debugging
   ```

**Tier 2 (Separation):**
1. Deploy separate Redis instances:
   - Redis A (Cache): 512MB, volatility-lru, TTL-enforced
   - Redis B (Queue): 1GB, allkeys-lru, persistent
   
   ```javascript
   // config/redis.js
   const cacheRedis = new Redis('redis://cache-host:6379/0');
   const queueRedis = new Redis('redis://queue-host:6379/0');
   
   // In jobProducerService
   const queue = createQueue(queueRedis);
   
   // In fraudDetectionService
   const cacheResult = await cacheRedis.get(`user_risk:${userId}`);
   ```

**Tier 3 (Optimization):**
1. Compress queue data:
   ```javascript
   import { compress, decompress } from 'brotli-wasm';
   
   const jobData = await compress(JSON.stringify(fullObject));
   // Reduces 50KB → 8KB (84% savings!)
   ```

2. Implement circuit breaker for cache misses:
   ```javascript
   if (cacheHitRatio < 0.70) {
     // Override cache; use DB directly
     return getFromDB(userId);
   }
   ```

---

## 4. Memory Bottleneck (Heap Growth / Leaks)

### Symptoms
- Memory usage grows from 1.2 GB startup → 1.9 GB over 30 minutes
- Garbage collection pauses increasing (p(99) tail latency spikes every 30s)
- OOM killer starts terminating process (dmesg: Out of memory)
- Soak test fails with increasing latency over time

### Metrics to Inspect

**Primary Evidence:**
```
Node.js Heap Used: trending upward (not stable during soak)
GC Frequency: increasing (more frequent pauses)
GC Pause Duration: > 200ms (causes latency spikes)
Heap Snapshot: Large object count growing unbounded
```

**k6 pattern:**
- Soak test p(95) latency starts 1000ms
- After 20 min: p(95) = 1300ms (30% degradation)
- Heap memory: 1.5GB → 1.95GB (steady climb)

### Root Causes
1. **Event listeners** not cleaned up (addEventListener without removeEventListener)
2. **Circular references** preventing garbage collection
3. **Global variables accumulating** data (e.g., global array that grows)
4. **Unresolved promises** keeping memory live
5. **Buffer leaks** in stream processing

### Diagnosis Steps

1. **Generate heap snapshot under load:**
   ```bash
   node --expose-gc server.js
   
   # In another terminal, during load test:
   # Send SIGUSR2 to process to trigger heap snapshot
   kill -USR2 <pid>
   # Creates heapdump-<timestamp>.heapsnapshot
   
   # Download and analyze in Chrome DevTools
   chrome://inspect → Open dedicated DevTools for Node.js
   ```

2. **Monitor heap growth in real-time:**
   ```javascript
   setInterval(() => {
     const used = process.memoryUsage();
     console.log({
       heapUsedMB: (used.heapUsed / 1024 / 1024).toFixed(2),
       externalKB: (used.external / 1024).toFixed(2),
       arrayBuffersKB: (used.arrayBuffers / 1024).toFixed(2),
     });
   }, 5000);
   ```

3. **Check for commonly leaking patterns:**
   ```bash
   # Global objects
   grep -n "^[a-zA-Z_].*= \[\]" backend/**/*.js | wc -l
   
   # EventEmitter listeners
   grep -n "\.on\(" backend/**/*.js | grep -v "\.once\|removeListener"
   
   # Unresolved promises
   grep -n "new Promise\|\.then\|\.catch" backend/**/*.js | wc -l
   ```

4. **Check MySQL connection pool for leaks:**
   ```javascript
   // In database operations:
   // OLD: Connection not released
   const connection = pool.getConnection();
   const results = connection.query('SELECT ...');
   // Missing: connection.release()
   
   // NEW: Proper cleanup
   const connection = pool.getConnection();
   try {
     const results = await connection.query('SELECT ...');
     return results;
   } finally {
     connection.release();  // Always cleanup
   }
   ```

### Remediation

**Tier 1 (Quick fixes):**
1. Force garbage collection more often:
   ```bash
   node --expose-gc server.js
   # Then periodically call:
   if (global.gc) global.gc();  // Every 5 minutes
   ```

2. Cap memory usage with `--max-old-space-size`:
   ```bash
   node --max-old-space-size=1400 server.js
   # Graceful restart when approaching 80% of limit
   ```

3. Enable heap snapshots in production (safely):
   ```javascript
   // Add admin endpoint (protected by auth)
   app.post('/admin/debug/heap-snapshot', authenticate, (req, res) => {
     const heapdump = require('heapdump');
     heapdump.writeSnapshot(`heapdump-${Date.now()}.heapsnapshot`);
     res.json({ status: 'snapshot saved' });
   });
   ```

**Tier 2 (Code cleanup):**
1. Identify event listener leaks:
   ```javascript
   // Find dangling listeners
   const emitter = new EventEmitter();
   emitter.on('event', handler);
   // Missing: emitter.removeListener('event', handler) before cleanup
   
   // FIX: Use once() for one-time handlers
   emitter.once('event', handler);
   // Auto-removes after first call
   ```

2. Fix connection pool lifecycle:
   ```javascript
   // Ensure all queries follow this pattern:
   const connection = await pool.getConnection();
   try {
     return await connection.query(sql, values);
   } finally {
     connection.release();
   }
   ```

3. Audit global state:
   ```javascript
   // BEFORE: Unbounded global growth
   const userCache = {};  // Grows forever
   app.post('/user', (req, res) => {
     userCache[req.user.id] = req.user;  // Never expires
   });
   
   // AFTER: Bounded with TTL
   const userCache = new Map();
   app.post('/user', (req, res) => {
     userCache.set(req.user.id, req.user);
     setTimeout(() => userCache.delete(req.user.id), 3600000);  // 1 hour TTL
   });
   ```

**Tier 3 (Restart strategy):**
1. Graceful restart before memory leak is critical:
   ```bash
   # Kubernetes / PM2
   pm2 start server.js --max-memory-restart 1400M
   # Automatically restarts process if heap exceeds 1400MB
   ```

2. Monitor in production and alert:
   ```javascript
   setInterval(() => {
     const used = process.memoryUsage().heapUsed;
     if (used > 1.4 * 1024 * 1024 * 1024) {  // 1400MB
       logger.error('CRITICAL_MEMORY_USAGE', { heapMB: used / 1024 / 1024 });
       // Trigger graceful shutdown + restart
     }
   }, 10000);
   ```

---

## 5. Stripe API Bottleneck (External Service Latency)

### Symptoms
- Payment intent creation (POST /api/payments/intent) consistently slow
- Reconciliation batch jobs taking 2+ minutes instead of expected 30 seconds
- Intermittent "Stripe timeout" errors in logs
- p(99) latency spikes to 5+ seconds only during revenue peak

### Metrics to Inspect

**Primary Evidence:**
```
Stripe API response time: > 2000ms (should be <500ms)
Stripe rate limit errors: Any 429 responses
Webhook delivery delay: >10 seconds (indicates Stripe backlog)
```

**k6 pattern:**
- Payment intent p(95) latency: 1500-3000ms (Stripe variability)
- Success rate: 98% (2% timeout failures)
- Soak test: Stripe calls cluster at specific times (rate limiting)

### Root Causes
1. **Stripe API rate limits** — 100 req/sec per account; spike testing hits them
2. **Network round-trip** — each Stripe call = 200-300ms baseline latency
3. **Payment intent lookup** in reconciliation — 250+ calls per batch = 125+ seconds
4. **No request timeout** — hangs waiting for slow Stripe response
5. **Stripe webhook processing slow** — payment webhook handler doesn't process fast enough

### Diagnosis Steps

1. **Check Stripe API logs (Dashboard → Developers → API Requests):**
   - Look for 429 (rate limit) responses
   - Filter by timestamp during load test run
   - Check latency histogram

2. **Monitor Stripe API calls from Node.js:**
   ```javascript
   // Wrap Stripe SDK with timing
   const stripe = require('stripe')(STRIPE_KEY);
   
   const originalRetrieve = stripe.paymentIntents.retrieve;
   stripe.paymentIntents.retrieve = async (...args) => {
     const start = Date.now();
     try {
       const result = await originalRetrieve(...args);
       const duration = Date.now() - start;
       if (duration > 1000) logger.warn(`Slow Stripe call: ${duration}ms`);
       return result;
     } catch (err) {
       logger.error(`Stripe API error`, { duration: Date.now() - start, error: err.message });
       throw err;
     }
   };
   ```

3. **Check reconciliation job duration:**
   ```sql
   SELECT run_id, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as started,
          TIMESTAMPDIFF(SECOND, created_at, updated_at) as duration_sec,
          stripe_verifications_attempted
   FROM payment_reconciliation_reports
   ORDER BY created_at DESC LIMIT 10;
   -- Look for duration > 120 seconds
   ```

4. **Verify request timeout is configured:**
   ```javascript
   // paymentReconciliationService.js
   const STRIPE_VERIFY_TIMEOUT = 6000;  // 6 seconds timeout per request
   const STRIPE_MAX_VERIFICATIONS = 250; // Cap requests per run
   ```

### Remediation

**Tier 1 (Immediate — no code changes):**
1. **Space out reconciliation runs** to avoid rate limits:
   ```javascript
   // Don't run reconciliation every webhook; batch hourly
   await queue.add(
     'reconciliation-run',
     {},
     {
       jobId: `reconciliation-${Math.floor(Date.now() / 3600000)}`,  // Hourly bucket
       delay: (Math.random() * 5 * 60 * 1000),  // Stagger 0-5 minutes
     }
   );
   ```

2. **Implement circuit breaker for Stripe calls:**
   ```javascript
   const CircuitBreaker = require('opossum');
   
   const verifyWithBreaker = new CircuitBreaker(
     async (paymentIntentId) => {
       return await stripe.paymentIntents.retrieve(paymentIntentId);
     },
     {
       timeout: 6000,
       errorThresholdPercentage: 50,  // Open if >50% fail
       resetTimeout: 30000,  // Try again after 30s
     }
   );
   
   try {
     return await verifyWithBreaker.fire(intentId);
   } catch (err) {
     logger.warn(`Stripe verification skipped (circuit open)`, { intentId });
     return null;  // Fail-open: continue without verification
   }
   ```

3. **Add request timeout to Stripe SDK calls:**
   ```javascript
   const stripe = require('stripe')(STRIPE_KEY, {
     httpClient: require('stripe/lib/net'),
     timeout: 6000,  // Milliseconds
   });
   ```

**Tier 2 (Caching):**
1. **Cache payment intent status** to avoid redundant lookups:
   ```javascript
   async function getPaymentIntentStatus(intentId) {
     const cacheKey = `stripe:intent:${intentId}`;
     const cached = await cache.get(cacheKey);
     if (cached) return JSON.parse(cached);
     
     const intent = await stripe.paymentIntents.retrieve(intentId);
     // Cache for 5 minutes; status unlikely to change
     cache.setex(cacheKey, 300, JSON.stringify(intent));
     return intent;
   }
   ```

2. **Batch Stripe lookups** (if Stripe SDK supports):
   ```javascript
   // Stripe has list() for most resources
   const intents = await stripe.paymentIntents.list({
     limit: 100,
     created: { gte: startTime },  // Filter by date range
   });
   // Single call retrieves up to 100 intents instead of 100 separate calls
   ```

**Tier 3 (Architectural):**
1. **Move reconciliation off critical path:**
   - Don't wait for reconciliation in webhook handler
   - Enqueue to BullMQ and let worker process async
   - If critical, setup webhook listener for Stripe events instead of polling

2. **Use Stripe Events API** instead of reconciliation:
   ```javascript
   // Instead of fetching intent from Stripe (expensive)
   // Listen for payment_intent.succeeded / .payment_intent.payment_failed
   // Stripe pushes to your webhook endpoint
   router.post('/webhooks/stripe', (req, res) => {
     const event = req.body;
     switch (event.type) {
       case 'payment_intent.succeeded':
         // Reconciliation event-driven instead of polling
         // Record the truth immediately with webhook data
         break;
     }
   });
   ```

3. **Request rate limit increase from Stripe Support:**
   - Stripe can whitelist accounts for 1,000+ req/sec
   - Free request if you explain use case

---

## 6. Network Bottleneck (Bandwidth / Latency to Clients)

### Symptoms
- Same endpoints fast for local tests (k6 on same server), slow from remote clients
- Geographically distant users report higher latency
- Large payloads (guide list) download slowly
- Connection timeout errors increase with distance

### Metrics to Inspect

**Primary Evidence:**
```
Time To First Byte (TTFB): > 500ms (should be <200ms)
Network latency to user: >100ms baseline (measure with ping)
Bandwidth utilized: >80% Mbps limit
```

**k6 pattern:**
- Local k6 test: p(95) = 1000ms
- Remote user test (different region): p(95) = 2500ms
- Difference = network + geographic distance

### Root Causes
1. **Guide list response too large** (48 KB per request)
2. **No compression** (gzip/brotli disabled)
3. **No CDN** for static assets (100+ guides, each 480 bytes uncompressed)
4. **DNS lookup latency** (slow DNS resolver)
5. **Server located far from users** (geographic latency)

### Diagnosis Steps

1. **Check response compression:**
   ```bash
   curl -I -H "Accept-Encoding: gzip" https://malebangkok.app/api/guides
   # Look for: Content-Encoding: gzip
   # If missing: compression not enabled
   ```

2. **Measure payload sizes:**
   ```bash
   curl -s https://malebangkok.app/api/guides | wc -c
   # Compare uncompressed vs compressed:
   curl -s -H "Accept-Encoding: gzip" https://malebangkok.app/api/guides | gunzip | wc -c
   # Compression ratio = compressed / uncompressed
   ```

3. **Check CDN presence (if using Hostinger Cloudflare):**
   ```bash
   curl -I https://malebangkok.app | grep -i x-cache
   # HIT = served from CDN cache
   # MISS = served from origin
   ```

4. **Measure DNS resolution time:**
   ```bash
   dig malebangkok.app +stats
   # Look at "Query time: Xms"
   ```

### Remediation

**Tier 1 (Quick wins):**
1. **Enable gzip compression in Express:**
   ```javascript
   import compression from 'compression';
   app.use(compression({ level: 6 }));  // Level 6 = good balance
   ```

2. **Reduce guide list payload:**
   ```javascript
   // OLD: All fields
   SELECT *, (SELECT COUNT(*) FROM reviews WHERE guide_id = guides.id) as review_count
   
   // NEW: Only displayed fields
   SELECT id, name, specialty, hourly_rate, review_count FROM guides
   ```

3. **Pagination:**
   ```javascript
   // OLD: All 1,000 guides
   GET /api/guides → 100+ KB
   
   // NEW: Paginated
   GET /api/guides?limit=20&page=1 → 10 KB
   ```

**Tier 2 (CDN):**
1. **Enable Hostinger Cloudflare (if available):**
   - Free tier: ~$5-10/mo
   - Automatic gzip compression
   - Geographic caching edge servers
   - DDoS protection

2. **Cache headers:**
   ```javascript
   // Cache guide list for 5 minutes
   app.get('/api/guides', (req, res) => {
     res.set('Cache-Control', 'public, max-age=300');  // 5 min
     // ...serve guide list
   });
   
   // Cache individual guide for 1 hour
   app.get('/api/guides/:id', (req, res) => {
     res.set('Cache-Control', 'public, max-age=3600');  // 1 hour
     // ...serve guide profile
   });
   ```

**Tier 3 (Architectural):**
1. **Serve from nearest Hostinger data center** (geographic routing)
2. **Implement GraphQL** to client request exact fields needed (instead of full JSON)
3. **Use Hostinger S3-compatible storage** for guide images (offload traffic)

---

## Decision Tree: Identify Your Bottleneck

```
START: System is slow
│
├─→ No latency degradation as VU count increases?
│   YES → CPU BOTTLENECK (Section 1)
│
├─→ Latency sharp spike at specific VU count (e.g., 40 VUs)?
│   YES → DATABASE BOTTLENECK (Section 2)
│       Check: mysql active connections
│       Check: slow query log
│
├─→ Redis keys disappearing? Queue jobs stuck?
│   YES → REDIS BOTTLENECK (Section 3)
│       Check: redis-cli INFO memory
│       Check: Queue job backlogs
│
├─→ Memory growing during soak test? OOM killer errors?
│   YES → MEMORY BOTTLENECK (Section 4)
│       Check: nodejs heap snapshot
│       Check: Event listener cleanup
│
├─→ Only payment / reconciliation endpoints slow?
│   YES → STRIPE API BOTTLENECK (Section 5)
│       Check: Stripe Dashboard API Requests
│       Look for: 429 rate limit errors
│
└─→ Local k6 test fast, remote user slow?
    YES → NETWORK BOTTLENECK (Section 6)
        Check: curl response size
        Check: gzip compression enabled
```

---

## Summary: Quick Reference

| Bottleneck | Metric to Check | Normal Range | Alert Threshold |
|---|---|---|---|
| **CPU** | CPU utilization | 35-45% | >70% sustained |
| **CPU** | Event loop lag | <5ms | >50ms |
| **Database** | Active connections | 4-6/20 | >15/20 |
| **Database** | Query p(95) | <300ms | >1000ms |
| **Redis** | Memory used | <100MB | >200MB |
| **Redis** | Commands/sec | <10,000 | >30,000 |
| **Memory** | Heap trend | flat | +100MB/hour |
| **Memory** | GC pause | <100ms | >300ms |
| **Stripe** | API response | <500ms | >2000ms |
| **Stripe** | Rate limit errors | 0 | >0 = problem |
| **Network** | Response size (guides list) | 10-48 KB | >100KB |
| **Network** | TTL (p95) | <1000ms | >2500ms |

Monitor these during k6 scenario runs. First breach = start diagnostics for that bottleneck.
