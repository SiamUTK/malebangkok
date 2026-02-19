# MaleBangkok Production Security Checklist (OWASP)

## A1 — Transport Security

- [x] HTTPS/TLS enforced in production (via Hostinger)
- [x] HSTS header enabled (31536000 seconds = 1 year)
- [x] HSTS preload flag enabled
- [x] HSTS applies to subdomains (`includeSubDomains: true`)
- [x] Helmet security headers applied (CSP, referrer-policy, X-Frame-Options)
- [x] Cross-Origin Resource Policy: same-site (prevents cross-origin embedding)
- [x] No HTTP traffic allowed in production (Hostinger config)
- [x] TLS 1.2+ enforced (Hostinger default)

## A7 — Cross-Site Scripting (XSS)

- [x] Content-Security-Policy with strict directives
  - `default-src 'self'`
  - `script-src 'self'` (no inline scripts)
  - `style-src 'self' 'unsafe-inline'` (inline styles only where needed)
  - `object-src 'none'` (no plugins/Flash)
  - `base-uri 'self'` (restrict base tag)
- [x] X-Content-Type-Options: `nosniff` (via helmet defaults)
- [x] X-Frame-Options: `DENY` (via helmet defaults)
- [x] Input sanitization via express-xss-sanitizer (removes XSS payloads)
- [x] Request logging includes URL + method (for incident forensics)
- [ ] Frontend Content-Security-Policy compatible (review after deploy)

## A3 — Injection (SQL/NoSQL/Command)

- [x] Parameterized MySQL queries only (`mysql2/promise` with placeholders)
- [x] No string concatenation in SQL (enforced via models)
- [x] Joi schema validation on all inputs (before route handlers)
- [x] HTTP Parameter Pollution (HPP) protection via `hpp` middleware
- [x] No raw SQL from user input (schema-gated, migration-based only)
- [x] Database timezone set to UTC in pool config
- [x] Max field length limits enforced (1.5KB notes, 150 char email, etc.)
- [ ] SQL injection pen test (to be scheduled)

## A6 — Broken Authentication

- [x] JWT with HS256 algorithm (symmetric, hardened)
- [x] Algorithm enforcement: only `HS256` accepted
- [x] Token expiration hardcoded: 7 days
- [x] JWT verified on every protected route (strict middleware)
- [x] Bearer token parsing: strict format validation
- [x] Malformed tokens rejected with 401 (no leaks)
- [x] Expired tokens rejected with explicit message
- [x] Account status checked (is_active flag)
- [x] Token payload type validation (id must be number)
- [x] No sensitive fields in JWT payload (email, role only)
- [ ] Consider adding refresh tokens (future enhancement)
- [ ] Consider 2FA for admin role (future enhancement)

## A1 — Rate Limiting (Anti-Abuse)

- [x] Global limiter: 100 req / 15 min per IP
- [x] Auth endpoints (login/register): 5 req / 15 min per IP (strict)
- [x] Admin endpoints: 50 req / 15 min per IP
- [x] Booking creation: 30 req / 15 min per IP
- [x] Payment intent: 20 req / 15 min per IP
- [x] Health check skipped from rate limit
- [x] Proxy trust enabled (X-Forwarded-For headers respected)
- [x] Consistent JSON 429 response with `retryAfter` field
- [x] Limit counts per IP, not per user (tighter security)
- [ ] DDoS mitigation at Hostinger WAF level (configure)

## A5 — Broken Access Control

- [x] Admin role middleware enforces authorization
- [x] Role check before sensitive operations (metrics, user ops)
- [x] User ownership verified for booking/payment reads
- [x] Guides endpoint (list) is public; profile is gated if needed
- [x] No user enumeration via /api/auth/me (requires valid token)
- [x] Request ID attached to all logs (audit trail)
- [x] Sensitive fields stripped from API responses (password, reset_token)
- [x] Security utility sanitizeUserForResponse() prevents PII leaks
- [ ] Audit log table for sensitive operations (future)
- [ ] Role-based API documentation (future)

## A2 — Sensitive Data Exposure

- [x] Password hashed with bcrypt (12 rounds)
- [x] JWT secret stored in environment variable only (never in code)
- [x] Database credentials in .env (not version-controlled)
- [x] Stripe secret key in environment (never exposed)
- [x] API responses exclude password/secret fields
- [x] Email and IP masking utilities available (maskEmail, maskIP)
- [x] Logging sanitizes URLs (no query params leaked)
- [x] Error messages do not expose stack traces in production
- [x] HTTPS enforced for all communication
- [x] Database backups encrypted at rest and access-controlled
- [ ] Log rotation enabled (ensure old logs are purged)
- [ ] Database backup encryption KMS integration (Hostinger feature)

## A9 — Logging & Monitoring

- [x] Winston logger configured (combined.log, error.log, access.log)
- [x] Request ID (UUID v4) on all requests
- [x] Access logs separate from error logs (filtering)
- [x] Error logs include stack trace (dev mode only)
- [x] Health endpoint includes database + memory status
- [x] Critical 500+ errors trigger alert service (logging for now)
- [x] Rate limit tracking via express-rate-limit headers
- [x] Structured JSON logging for machine parsing
- [x] Response time measured in milliseconds (hrtime for precision)
- [ ] Log aggregation tool (ELK, Datadog, etc.) - future
- [ ] Error alerts to Slack/PagerDuty (webhook ready)
- [ ] Database query logging (slow query threshold)

## A10 — SSRF Prevention

- [x] No user-controlled URL redirects in API
- [x] Stripe webhook signature validation (STRIPE_WEBHOOK_SECRET)
- [x] Whitelist-based CORS origin (configurable)
- [x] API endpoints do not accept arbitrary redirect URLs
- [ ] Add validate-url library if redirects added (future)

## Secrets Management

- [x] All secrets in .env file (never in code)
- [x] Environment variables checked at startup
- [x] Missing env vars cause immediate failure (hard requirement)
- [x] Production NODE_ENV enforces strict helmet options
- [x] CORS_ORIGIN configurable per environment
- [x] Rate limit thresholds configurable via env vars
- [x] Health endpoint DB timeout configurable
- [ ] Secrets rotation policy documented (quarterly)
- [ ] .env.example provides template (no sensitive defaults)

## Database Security

- [x] Connection pool configured with SSL/TLS ready
- [x] Min/max connection limits set (20 default, configurable)
- [x] Connection timeout and keepalive enabled
- [x] Parameterized queries enforced (no string concat)
- [x] Database user has minimum privileges (read/write only)
- [x] Schema migrations tracked (schema.sql versioning)
- [x] Backup strategy defined (6-hourly + daily)
- [x] Disaster recovery playbook documented
- [x] Database time zone set to UTC (consistency)
- [ ] Read replica for analytics (future at scale)
- [ ] Row-level encryption for sensitive PII (future)

## API & Request Handling

- [x] X-Powered-By header disabled
- [x] Request size limits set (1MB JSON, 1MB URL-encoded)
- [x] CORS configured with whitelist
- [x] Stripe webhook raw body parsing (separate from JSON)
- [x] No deprecated HTTP methods allowed
- [x] All error responses use consistent format
- [x] No stack traces in production responses
- [x] Request ID present in all responses (X-Request-Id header)
- [x] 404 handlers prevent information leakage
- [ ] API versioning headers (future: X-API-Version)
- [ ] Rate limit headers in response (X-RateLimit-*)

## Deployment & Operations

- [x] NODE_ENV set to 'production' in Hostinger
- [x] Database connection verified on startup
- [x] Graceful error handling (no unhandled rejections)
- [x] Health check endpoint responds with uptime + memory
- [x] Logs directory created automatically if missing
- [x] Server startup failure fails fast (env validation)
- [ ] Process manager configured (PM2 or similar) - Hostinger managed
- [ ] Log rotation configured (prevent disk filling)
- [ ] Database vacuum/analyze scheduled (MySQL weekly)
- [ ] Uptime monitoring dashboard (Hostinger or third-party)

## Incident Response

- [x] Critical error alerting system implemented (logging + webhook-ready)
- [x] Request ID enables full incident tracking
- [x] Backup strategy documented for RTO/RPO
- [x] Error handler does not expose internals
- [x] Database disconnect detection in health check
- [ ] Incident runbook for common failures (to document)
- [ ] Security incident disclosure policy (to document)

## Future Enhancements (Post-MVP)

- [ ] Add refresh token flow (extend session security)
- [ ] Implement 2FA for admin accounts
- [ ] Add email verification on registration
- [ ] Rate limit per user ID (after auth, in addition to IP)
- [ ] Database audit table for sensitive operations
- [ ] Log aggregation and alerting (ELK Stack, Datadog)
- [ ] API versioning support (API v1, v2, etc.)
- [ ] Implement API key support (for machine clients)
- [ ] Database encryption at rest (KMS integration)
- [ ] Web Application Firewall (Hostinger DDoS Shield)
- [ ] Penetration testing (quarterly)
- [ ] SOC 2 compliance audit

## Verification Steps

- [x] All required environment variables present
- [x] Database schema matches production expectations
- [x] TLS certificate valid and configured
- [x] Rate limiters respond with correct HTTP 429 status
- [x] JWT middleware rejects malformed tokens
- [x] CORS whitelist blocks unauthorized origins
- [x] Helmet headers present in all responses
- [x] Health endpoint includes database connectivity
- [x] Error logs do not expose sensitive information
- [x] Sensitive fields sanitized from API responses
- [ ] Load test within rate limit thresholds
- [ ] Chaos test: database down, verify health check
- [ ] Chaos test: token expired, verify clean rejection

---

**Last Updated:** February 19, 2026  
**Status:** Production Ready (MVP Security)  
**Next Review:** May 19, 2026 (quarterly)
