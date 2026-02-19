# Hostinger Cloud Operational Guide - MaleBangkok Production Deployment

## Overview
This guide provides Hostinger-specific configuration, scaling decisions, and operational procedures for running MaleBangkok at production scale.

---

## 1. Hostinger Cloud Infrastructure Profile

### 1.1 Standard Plan Specifications (Launch Configuration)
**Machine Class:** AMD EPYC 2-core 2GB
```
CPU:        2 × AMD EPYC Zen 3 cores, 3.5 GHz base
Memory:     2 GB DDR4 ECC
Storage:    50 GB NVMe SSD
Network:    Shared 100 Mbps uplink
OS:         Ubuntu 20.04 LTS (recommended)
Location:   Choose based on target user geography (Asia: Bangkok, Singapore recommended)
```

**Performance Profile:**
- Max sustained load: 150-200 req/s (with headroom)
- Concurrent connections: 40-50 VUs comfortably; degradation >70 VUs
- Suitable for: MVP launch, first 3-6 months (assume 10-50 bookings/day growth)

### 1.2 Standard Pro Plan (Upgrade Path)
**Machine Class:** AMD EPYC 4-core 4GB
```
CPU:        4 × AMD EPYC cores, 3.5 GHz (2× baseline)
Memory:     4 GB DDR4 ECC (2× baseline)
Storage:    100 GB NVMe SSD
Network:    Shared 100 Mbps uplink (same)
Cost:       ~$25-30 USD/month (2.5× Standard)
```

**Scaling Decision:** Upgrade when peak latency p(95) >1500ms OR memory >85% utilization.

### 1.3 Hostinger Managed Database (Recommended Separation)
**When to use:** Once primary instance hits memory pressure from MySQL.

**Specs:**
```
MySQL 8.0.28+ (dedicated)
Storage:    50 GB SSD
Backups:    Automated daily, 7-day retention
Failover:   Not available in starter tier (high-availability requires pro)
Cost:       ~$5-15/month (varies by size)
```

**Migration:** Simple `mysqldump` → restore to new instance; update connection string.

---

## 2. Resource Allocation on Standard (2GB)

### 2.1 Memory Carving (Safe Defaults)
```
┌───────────────────────────────────────────┐
│ Hostinger Cloud 2GB Total Allocation      │
├───────────────────────────────────────────┤
│ OS + kernel buffers:        400 MB        │
│ Node.js heap reserved:      700 MB        │
│ MySQL 8.0:                  600 MB        │
│ Redis (cache):              150 MB        │
│ Buffer cache / swap:        150 MB        │
│ Emergency headroom:          50 MB        │
└───────────────────────────────────────────┘
CRITICAL: Do not allocate >100% of 2GB
```

### 2.2 Enforcing Memory Limits

**Configure MySQL to not exceed 600 MB:**
```bash
# SSH into Hostinger instance
ssh root@your-hostinger-ip

# Edit MySQL config:
nano /etc/mysql/mysql.conf.d/mysqld.cnf

# Add:
[mysqld]
max_connections = 20
innodb_buffer_pool_size = 400M
query_cache_size = 64M  # Keep modest
host_cache_size = 100

# Restart:
systemctl restart mysql
```

**Configure Node.js heap limit:**
```bash
# backend/server.js or .env
NODE_OPTIONS="--max-old-space-size=700"

# Or in package.json:
"scripts": {
  "start": "node --max-old-space-size=700 server.js"
}
```

**Configure Redis if on same instance (not recommended for production):**
```bash
# /etc/redis/redis.conf or Hostinger Redis config
maxmemory 150mb
maxmemory-policy volatile-lru
```

### 2.3 Swap Configuration (Safety Net)
Hostinger includes ~1GB swap by default. Use as last resort only:
```bash
# Check swap:
free -h

# If swap enabled, it will show non-zero swap usage. This is BAD; means physical RAM exhausted.
# Alert: if swap usage > 100MB, immediate intervention required (restart service or upgrade).
```

Use swap monitoring alert:
```bash
# Alert if swap used > 100MB (danger zone)
if [ $(free | awk '/^Swap:/ {print $3}') -gt 100000 ]; then
  echo "CRITICAL: Swap usage high" | mail alert@malebangkok.app
  # Trigger graceful service shutdown for restart
fi
```

---

## 3. Disk I/O and SSD Optimization

### 3.1 Storage Layout
```
/
├── /root                       (system, keep small)
├── /var/log/                   (MySQL, Node.js logs → rotate!)
├── /var/lib/mysql/             (database files, 20-40 GB typical after growth)
├── /home/app/malebangkok/      (codebase + uploads, 5-10 GB)
└── /mnt/data                   (optional second volume if added)
```

**Storage High-Water Mark:** 45 GB of 50 GB = 90% (PoC). Plan early upgrade path.

### 3.2 Log Rotation (Prevent /var/log Bloat)
```bash
# Create rotate config:
nano /etc/logrotate.d/malebangkok

# Content:
/backend/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}

/var/log/mysql/*.log {
    daily
    rotate 7
    compress
    delaycompress
}

# Test:
logrotate -v /etc/logrotate.d/malebangkok
```

### 3.3 MySQL InnoDB Settings (SSD-Specific)
```bash
# /etc/mysql/mysql.conf.d/mysqld.cnf

[mysqld]
# SSD-optimized:
innodb_flush_method = O_DIRECT    # Bypass OS cache, use SSD directly
innodb_flush_log_at_trx_commit = 2  # Balance between durability + performance
innodb_io_capacity = 500           # Hostinger SSD can handle 500 IOPS
innodb_io_capacity_max = 1000      # Burst capacity

# Logging:
log_error = /var/log/mysql/error.log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1                # Log queries > 1 second
```

Restart MySQL:
```bash
systemctl restart mysql
```

---

## 4. Network & Connectivity

### 4.1 Bandwidth Considerations
**Hostinger Standard:** Shared 100 Mbps uplink
```
At 34 req/s baseline (guide heavy):
- Guide list: 6 req/s × 48 KB = 288 KB/s
- Auth endpoints: 4 req/s × 5 KB = 20 KB/s
- Revenue: 1 req/s × 10 KB = 10 KB/s
Total: ~320 KB/s = 2.56 Mbps

Utilization: 2.56 / 100 = 2.6% (comfortable headroom)
```

**Not a bottleneck** unless you scale to 1000+ req/s or serve large files.

### 4.2 Enable HTTP/2 and TLS
**Why:** Multiplexing reduces latency; TLS is now expected.

```bash
# Hostinger typically provides free Let's Encrypt via cPanel / console
# Verify in Hostinger dashboard: Security → SSL Certificate
# Should auto-renew

# In Express (if not behind Hostinger reverse proxy):
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('/path/to/privkey.pem'),
  cert: fs.readFileSync('/path/to/cert.pem'),
};

https.createServer(options, app).listen(443);
```

### 4.3 DNS Configuration (Critical for Guide Matching)
Hostinger provides DNS management; ensure:
```
A Record:    malebangkok.app → Hostinger server IP
CNAME:       www → malebangkok.app
MX Record:   mail.hostinger.com (for transactional emails)
```

**TTL:** Set to 3600 seconds (1 hour) for flexibility during scaling.

---

## 5. Deployment & Restart Procedures

### 5.1 Zero-Downtime Deployment (Blue-Green Pattern)
For Hostinger Standard (single instance), implement graceful shutdown:

**Step 1: Deploy new code**
```bash
# SSH into Hostinger
cd /root/malebangkok

# Backup current state
git stash  # or commit changes

# Pull new:
git pull origin main

# Install deps (if changed)
cd backend && npm install
```

**Step 2: Graceful shutdown**
```bash
# Send SIGTERM to Node.js (triggers graceful queue shutdown)
pm2 gracefulReload app

# PM2 will:
# 1. Stop accepting new requests
# 2. Drain in-flight requests (timeout 30s)
# 3. Close database connections
# 4. Restart process with new code
# 5. Resume accepting requests
```

**Total downtime:** <30 seconds (imperceptible to most users).

### 5.2 PM2 Configuration (Start/Stop/Restart)
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'malebangkok-api',
      script: './server.js',
      cwd: './backend',
      instances: 1,                    // Single instance on Standard
      exec_mode: 'fork',               // Not cluster (would split 2 cores poorly)
      node_args: '--max-old-space-size=700',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,  // Add timestamp to logs
      
      // Auto-restart on failure:
      autorestart: true,
      max_memory_restart: '1400M',  // Restart if heap > 1400MB
      max_restarts: 10,
      min_uptime: '10s',
      
      // Graceful shutdown:
      wait_ready: true,
      listen_timeout: 5000,
      kill_timeout: 30000,  // 30 sec grace before SIGKILL
    },
  ],
};
```

**Start/restart commands:**
```bash
# Start:
pm2 start ecosystem.config.js

# Monitor:
pm2 monit

# Graceful restart (deploys):
pm2 gracefulReload app

# Force restart (emergency):
pm2 restart app

# Stop:
pm2 stop app

# Logs:
pm2 logs app --lines 100
pm2 logs app --err      # error log only
```

### 5.3 Health Check During Deployment
```javascript
// backend/routes/healthRoutes.js (already exists)
// During graceful reload, this should:
// 1. Return 200 OK if ready
// 2. Return 503 Service Unavailable if draining

app.get('/api/health', (req, res) => {
  if (process.drain === true) {
    return res.status(503).json({ status: 'draining' });
  }
  res.json({ status: 'ok', timestamp: Date.now() });
});
```

---

## 6. Monitoring & Alerting Setup

### 6.1 CPU / Memory / Disk Monitoring
**Use PM2 Plus (free tier adequate):**
```bash
# Install PM2 Plus:
npm install -g @pm2/plus

# Link to Hostinger instance:
pm2 link [secret-key] [public-key]

# Dashboard: app.pm2.io
# Shows: CPU %, Memory %, restart history, logs
```

**Manual monitoring during peak:**
```bash
# SSH and watch real-time:
top -b -n 1 | head -20
iostat -x 1 5    # disk I/O
vmstat 1 5       # memory/cpu trends

# Check MySQL:
mysql -u root -p -e "SHOW PROCESSLIST;" # active queries
```

### 6.2 Alert Configuration (Email via Hostinger SMTP)
```bash
# Install alerting tool:
npm install nodemailer

# Example alert middleware:
const monitorResources = setInterval(() => {
  const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;
  
  if (memUsage > 1350) {  // 85% of 1600 available
    sendAlert(`CRITICAL MEMORY: ${memUsage.toFixed(0)} MB`, 'oncall@team.app');
    // Trigger graceful restart
    pm2.gracefulReload('app');
  }
}, 10000);  // Check every 10s
```

### 6.3 Slow Query Detection
```bash
# SSH into Hostinger; enable MySQL slow log:
mysql -u root -p -e "SET GLOBAL slow_query_log = ON;"
mysql -u root -p -e "SET GLOBAL long_query_time = 1;"

# Monitor file:
tail -f /var/log/mysql/slow.log

# Identify pattern queries:
grep "SELECT" /var/log/mysql/slow.log | awk '{print $NF}' | sort | uniq -c | sort -rn | head -10
```

---

## 7. Scaling Decision Tree

### 7.1 Upgrade from Standard to Standard Pro
**When:** Any of the following are true:
1. p(95) latency consistently >1500ms at baseline load
2. Memory utilization >85% during peak hours (1.36 GB+ sustained)
3. Database connection pool >15/20 active regularly
4. CPU sustained >70% (not just spikes)
5. Weekly bookings >100 (expect user growth trajectory)

**Cost:** ~$25-30/month (2.5× Standard).

**Do not:** Try to optimize past 2GB capacity; upgrade is cheaper than engineering effort.

### 7.2 Horizontal Scaling (2-3 Instance Architecture)
**When:** Standard Pro is insufficient OR you expect >500 bookings/week.

**Architecture:**
```
                    Hostinger Load Balancer ($10/mo)
                           ↓
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
    Instance 1         Instance 2         Instance 3
  (4-core, 4GB)      (4-core, 4GB)      (4-core, 4GB)
  node:3000          node:3000          node:3000
        ↓                  ↓                  ↓
        └──────────────────┼──────────────────┘
                           ↓
        Shared RDS MySQL 8 (separate instance, 8GB)
        Shared Redis (cache layer, 512MB)
```

**Cost estimate:**
- 3 × Standard Pro: $75/mo
- Load Balancer: $10/mo
- RDS MySQL 8GB: $40/mo
- Redis: $20/mo
- **Total: $145/mo** (vs. $25/mo Standard)

**Advantages:**
- Combined Node.js capacity: 300 req/s sustainable
- Database no longer competes for memory
- Can deploy independently; maintain 2 instances running
- Automatic failover (if one instance fails, 2 others continue)

**Configuration:**
```javascript
// backend/config/db.js
const host = process.env.DB_HOST || 'shared-rds.hostinger.com';
const user = process.env.DB_USER || 'malebangkok';
const password = process.env.DB_PASSWORD;
const database = process.env.DB_NAME || 'malebangkok_prod';

const pool = mysql.createPool({
  connectionLimit: 30,  // Pool size increased (shared load)
  waitForConnections: true,
  queueLimit: 100,
  host, user, password, database,
});
```

Deploy same codebase to all 3 instances; load balancer distributes traffic.

### 7.3 Read Replicas for Analytics/Reconciliation
**When:** Reconciliation batch job is competing with booking traffic.

**Setup:**
```
             RDS Primary (write)     ← bookings, payments
                     ↓
            ┌─────────┴─────────┐
            ↓                   ↓
      Replica 1 (read)    Replica 2 (read)
      analytics + old      reconciliation
      behavior data        reports
```

**Code change:**
```javascript
// In paymentReconciliationService:
const readDb = mysql.createPool({
  host: 'replica-2.hostinger.com',
  ...
});

// Queries go to replica; writes still go to primary
const findings = await readDb.query(/* SELECT */)
```

Cost: +$25/mo per replica.

---

## 8. Backup & Recovery Strategy

### 8.1 Automated Backups (Hostinger Managed DB)
If using Hostinger Managed Database:
- Automatic daily backups
- 7-day retention
- Point-in-time recovery available (enterprise)

**Manual backup (if on Standard instance):**
```bash
# SSH into Hostinger
cd /root

# Full dump:
mysqldump -u root -p --all-databases > backup-$(date +%Y%m%d).sql

# Compress:
gzip backup-*.sql

# Upload to Hostinger Backups (or external storage):
# Download from Hostinger → Files → /root/
```

### 8.2 Recovery Procedure (Disaster)
```bash
# Stop app:
pm2 stop app

# Restore from backup:
mysql -u root -p < backup-20250219.sql

# Restart:
pm2 start app

# Verify:
curl http://localhost:3000/api/health
```

**Expected RTO (Recovery Time Objective):** <5 minutes.

### 8.3 Test Backup Restoration Quarterly
```bash
# Schedule:
0 1 1 * * /home/scripts/backup-test.sh

# Script:
#!/bin/bash
# Restore to test database
mysql -u root -p -e "CREATE DATABASE test_restore FROM BACKUP;"
mysql test_restore < backup-latest.sql
# Run integrity checks
mysqlcheck -u root -p test_restore
# Clean up
mysql -u root -p -e "DROP DATABASE test_restore;"
```

---

## 9. Production Runbook

### 9.1 Daily Operations Checklist
```
[ ] Morning: Check PM2 monit dashboard
    → CPU <70% during peak? (8am-10am peak user times)
    → Memory <80%?
    → Restart count (every 24h is normal; >2/day is problem)

[ ] Mid-day: Verify booking flow (manual test)
    → Create test guide
    → Create test booking
    → Create payment intent
    → Check email notification sent

[ ] Evening: Check logs for errors
    → pm2 logs app --err | tail -50
    → /var/log/mysql/error.log | tail -20
    → Any Stripe errors?

[ ] Weekly: Check disk space
    → df -h | grep "/" | awk '{print $5}'
    → If >80%, run log rotation or upgrade storage

[ ] Monthly: Review slow query log
    → What queries are slow?
    → Do they need indexes?
    → Contact developer if pattern concerning

[ ] Quarterly: Test backup restoration
```

### 9.2 Escalation Procedures

**Alert: CPU >80%**
1. Check what's using CPU: `top` → most CPU-consuming process
2. If Node.js: Check `pm2 logs app` for errors; maybe query spike
3. If MySQL: Check `SHOW PROCESSLIST;` for long-running queries
4. If lingers: Graceful restart app or database
5. If recurring: Upgrade plan or optimize code

**Alert: Memory >85%**
1. Check Node.js heap: `pm2 logs app | grep -i memory`
2. If climbing: Potential leak; restart gracefully (pm2 gracefulReload)
3. If stable: Normal; monitor for breach of 90%
4. If breached: **Immediate restart** (graceful shutdown process)
5. Investigate after restart; consider upgrade

**Alert: Latency p(95) >1500ms for >5 min**
1. Check database active connections (near 20/20?)
2. Run slow query log check for recent offenders
3. Check Redis memory (evictions causing cache misses?)
4. If temporary spike: Usually resolves in <10 min
5. If sustained: Scale up or investigate specific endpoint

**Alert: Booking success <97%**
1. **CRITICAL** — revenue is breaking down
2. Check Stripe integration: `curl https://api.stripe.com/... -H "auth..."`
3. Check payment intent creation logs; look for errors
4. Verify database bookings table not full
5. If still broken: Disable bookings temporarily, page on-call engineer

### 9.3 Incident Response
**Payment system down (no bookings):**
1. Disable booking endpoint (return 503)
2. Check database connectivity
3. Check Stripe API status (stripe.com/status)
4. Restore from backup if data corruption
5. Post-incident: Review logs; notify users

**Memory exhaustion (OOM kill):**
1. App automatically restarts via PM2
2. Check if memory is stable after restart
3. If not: Investigate logs for memory leak
4. Temporary fix: Reduce cache TTLs
5. Permanent fix: Upgrade plan or code optimization

---

## 10. Cost Optimization

### 10.1 Hostinger Billing
**Standard Plan:** $5-6/month (billed annually as low as $2/month).
**Standard Pro:** $15-18/month (billed annually).

**Example Year 1 Costs:**
- 12 months Standard: $72 (launch)
- Month 4: Upgrade to Standard Pro: $180/yr
- **Total: ~$252 (first year)**

### 10.2 Bandwidth Overage
Hostinger Standard: 100 Mbps shared (included).
- Overage charges only if sustained >100 Mbps (rare, requires 1000+ req/s)
- Plan for: <10% chance in first year

### 10.3 Add-on Costs (When to Buy)
| Add-on | Cost | When | Necessity |
|--------|------|------|-----------|
| Managed Database | $5-15/mo | Month 3-4 | High (separate from app) |
| Load Balancer | $10/mo | Month 5-6 | High (multi-instance) |
| Redis Cache | $10-20/mo | Month 2-3 | Medium (reduce DB load) |
| SSL/TLS | Free (Let's Encrypt) | Day 1 | Critical |
| Email API (SendGrid) | $10-20/mo | Month 1 | Medium (transactional emails) |
| CDN (Cloudflare) | $20/mo | Month 4-5 | Low (guide images cached) |

**Total Year 2 (mature):** ~$400-500/mo (3 instances + DB + cache).

---

## 11. Troubleshooting Quick Reference

| Symptom | Debug Command | Root Cause | Fix |
|---------|---------------|-----------|-----|
| 503 Service Unavailable | `pm2 status` | App crashed | `pm2 start ecosystem.config.js` |
| High latency (p95 >2000ms) | `mysql -e "SHOW PROCESSLIST;"` | Slow query | Add index; check slow log |
| Memory constantly >1.5GB | `pm2 logs app\|grep -i memory` | Memory leak | Restart; investigate logs |
| Redis connection refused | `redis-cli ping` | Redis down | Restart Redis or use fallback cache |
| Bookings failing silently | Check Stripe logs; test webhook | Payment intent timeout | Increase timeout; retry logic |
| Users complaining lag | `top` + `iostat` | Disk I/O or CPU contention | Check concurrent load; upgrade if sustained |
| Database locked (queries hang) | `mysql -e "SHOW ENGINE INNODB STATUS;"` | Table lock | Kill blocking query; optimize transaction |

---

## Summary: Hostinger Readiness Checklist

- [ ] Created MySQL credentials and created database `malebangkok_prod`
- [ ] Set up PM2 with ecosystem.config.js
- [ ] Configured environment variables (.env or Hostinger panel)
- [ ] Enabled MySQL slow query logging
- [ ] Set Node.js memory limit (--max-old-space-size=700)
- [ ] Configured log rotation (logrotate)
- [ ] Set up email alerts via Hostinger SMTP
- [ ] Tested graceful restart (pm2 gracefulReload app)
- [ ] Backed up initial database
- [ ] Configured health check endpoint (/api/health)
- [ ] Verified SSL/TLS enabled (Let's Encrypt)
- [ ] Planned upgrade path (timeline + trigger conditions)

**Status:** ✓ Ready for Production Deployment
