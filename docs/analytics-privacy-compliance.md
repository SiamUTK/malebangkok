# PART F — Privacy & Compliance Layer

## MaleBangkok Analytics Privacy Policy & Implementation

---

## 1. PRIVACY-FIRST PRINCIPLES

### Core Policy

MaleBangkok's analytics must operate under **privacy-by-design** principles. We track behavioral data only for:

1. **Conversion Optimization** — Improving user funnel and reducing friction
2. **Revenue Tracking** — Financial reconciliation with Stripe
3. **AI Matching Improvement** — Better guide recommendations
4. **Fraud Prevention** — Identifying suspicious activity

We explicitly **do not** track for:
- ❌ User profiling (building psychological profiles for manipulation)
- ❌ Third-party sales (sharing data with marketers)
- ❌ Long-term identification (tracking users across the web)
- ❌ Sensitive categories (sexual orientation, health, religion)

---

## 2. DATA MINIMIZATION RULES

### What We Track (Allowed)

| Data Type | Usage | Retention | Risk |
|-----------|-------|-----------|------|
| **Guide ID** | Matching, ranking, revenue | 1 year | Low (public) |
| **Session ID** | Funnel analysis | 90 days | Low (anonymous) |
| **Booking ID** | Revenue tracking | Permanent | Acceptable (business necessity) |
| **User ID (hashed)** | Repeat user tracking | 1 year | Low (anonymized) |
| **Page visited** | Navigation funnel | 30 days | Low (behavioral) |
| **Time on page** | Engagement metrics | 30 days | Low (behavioral) |
| **Device type** | Mobile optimization | 30 days | Low (non-identifying) |
| **Button clicked** | CTR measurement | 30 days | Low (behavioral) |
| **Booking amount (€)** | Revenue KPIs | Permanent | Protected (financial) |

### What We DON'T Track (Prohibited)

| Data Type | Reason | Risk |
|-----------|--------|------|
| **User name** | PII - high privacy risk | 🔴 Violates GDPR |
| **User email** | PII - could identify user | 🔴 Violates GDPR |
| **User phone number** | PII - highly identifiable | 🔴 Violates GDPR |
| **IP address (unmasked)** | Geolocation + identification | 🔴 Violates GDPR |
| **Device ID/IDFA** | Cross-device tracking | 🔴 High privacy risk |
| **Credit card number** | PCI-DSS violation | 🔴 Illegal to store |
| **Location (precise)** | Behavioral profiling | 🔴 May violate local laws |
| **Browsing history** | Profiling data | 🔴 Privacy violation |

---

## 3. USER IDENTIFICATION STRATEGY

### Hashing User IDs (SHA256)

Every user_id sent to analytics must be hashed, never raw.

**Implementation:**

```javascript
// CORRECT: Hash before sending
const userIdHashed = await crypto.subtle.digest('SHA-256', userIdRaw);
gtag('event', 'purchase', { user_id: userIdHashed });

// WRONG: Never do this
gtag('event', 'purchase', { user_id: 'user@email.com' });
```

**Why:**
- ✓ Hashing is one-way (can't reverse to get original user ID)
- ✓ Same user gets same hash (enables repeat user tracking)
- ✓ Different users get different hashes (no false matches)
- ✓ Compliant with GDPR pseudonymization

**Verification:**
```javascript
// Every time user_id is sent to analytics, verify it's hashed in code review:
// Good: user_id_hashed, user_id_hash, userHashId
// Bad: user_id, userId, user_email, username
```

---

## 4. IP MASKING & GEOLOCATION

### GA4 IP Masking (Automatic)

GA4 automatically masks the last octet of IP addresses:

```
User's actual IP:     203.45.678.910
GA4 stores:           203.45.678.0
```

This prevents identification while preserving country-level analytics.

**Implementation (Required in GA4 Settings):**

Google Analytics 4 → Admin → Data Settings → IP Masking → **Enable**

---

## 5. COOKIE CONSENT STRATEGY

### Privacy-First Consent Flow

```

User visits MaleBangkok.com
           ↓
┌─────────────────────────────────────────────────┐
│ "We use analytics to improve the platform"      │
│ □ Accept Analytics  □ Reject (or just browse)   │
└─────────────────────────────────────────────────┘
           ↓
           └─→ ACCEPT:
               • Load gtag (GA4)
               • Load analytics.js
               • Fire pageview event
               • Set cookie: _analytics_consent=true
               • Enable revenue tracking
           
           └─→ REJECT:
               • Continue using platform normally
               • No tracking at all
               • No cookie set
               • Revenue tracking disabled
               • User can still book, no friction added
```

### Minimal Consent Banner

```jsx
// components/ConsentBanner.jsx
// Simple, not intrusive

import { useState, useEffect } from 'react';

export const ConsentBanner = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const hasConsent = localStorage.getItem('analytics_consent');
    
    if (!hasConsent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('analytics_consent', 'true');
    // Initialize GA4 analytics
    if (window.gtag) {
      window.gtag('consent', 'update', {
        'analytics_storage': 'granted'
      });
    }
    setShowBanner(false);
  };

  const handleReject = () => {
    localStorage.setItem('analytics_consent', 'false');
    // Disable GA4
    if (window.gtag) {
      window.gtag('consent', 'update', {
        'analytics_storage': 'denied'
      });
    }
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-90 text-white p-4 text-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <p>
          We use analytics to improve performance and user experience.{' '}
          <a href="/privacy" className="underline">
            Learn more
          </a>
        </p>
        <div className="flex gap-2 whitespace-nowrap">
          <button
            onClick={handleReject}
            className="px-4 py-2 border border-white rounded hover:bg-white hover:text-black transition"
          >
            Reject
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition"
          >
            Accept Analytics
          </button>
        </div>
      </div>
    </div>
  );
};
```

### Consent Check in Analytics.js

```javascript
// In analytics.js, check consent before firing events
const getAnalyticsConsent = () => {
  try {
    const consent = localStorage.getItem('analytics_consent');
    return consent === 'true'; // Only track if explicitly accepted
  } catch {
    return false; // Fail closed - don't track if unsure
  }
};

export const trackEvent = (eventName, params = {}) => {
  if (!getAnalyticsConsent()) {
    debug('Analytics consent not given, skipping event: ' + eventName);
    return false;
  }
  
  // Continue with tracking...
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
};
```

---

## 6. DATA RETENTION POLICY

### Retention Schedule (GDPR-Compliant)

| Data Type | Retention Period | Reason | Deletion Method |
|-----------|------------------|--------|-----------------|
| Google Analytics 4 data | 14 months | GA4 default; purged automatically | GA4 auto-expiration |
| Revenue events (MySQL) | Permanent | Financial records required for 7 years | Manual archive after year 7 |
| Session logs | 30 days | Funnel debugging | Automated daily deletion |
| AI training signals | 365 days | One year of ML model training | Automated deletion script |
| User hashed IDs | 1 year | Repeat user identification | MySQL retention policy |
| IP address logs | 7 days | Security only | Automated deletion |
| Form abandonment data | 90 days | CRO optimization | Automated deletion |

### Automated Retention Job

```sql
-- Run daily at 2 AM UTC
-- Deletes old analytics data per retention policy

DELETE FROM ai_training_signals 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 365 DAY);

DELETE FROM session_logs 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

DELETE FROM form_abandons 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Revenue events: KEEP FOREVER (financial records)
-- (No deletion for revenue_events)
```

---

## 7. SENSITIVE DATA HANDLING

### What NOT to Send to Analytics

```javascript
// ❌ WRONG - Never send these:

// User emails
gtag('event', 'purchase', { 
  user_email: 'john@example.com'  // ← PII VIOLATION
});

// Phone numbers
trackEvent('booking_start', {
  user_phone: '+66812345678'      // ← PII VIOLATION
});

// Credit card info
trackEvent('payment_processed', {
  card_number: '4111-1111-1111-1111'  // ← PCI-DSS VIOLATION
});

// Location (precise)
trackEvent('user_location', {
  latitude: 13.7563,
  longitude: 100.5018             // ← Privacy violation
});

// ✓ CORRECT - Only anonymized versions:

gtag('event', 'purchase', {
  user_id: userIdHashed,           // ← Hashed
  currency: 'THB'
});

trackEvent('user_approximate_location', {
  country_code: 'TH',              // ← Country only, not precise
  timezone: 'Asia/Bangkok'
});
```

### Stripe Payment Handling

```javascript
// Stripe handles all sensitive payment data
// We ONLY store in analytics:
// - booking_id (non-sensitive)
// - amount (necessary for revenue tracking)
// - currency (necessary for reporting)
// - stripe_charge_id (for reconciliation)

// We NEVER send to analytics:
// - Credit card number
// - Credit card CVC
// - Cardholder name
// - Billing address
// - Any other PII

export const trackRevenue = async (bookingData) => {
  // ✓ Good: Only store what's necessary
  trackEvent('purchase', {
    booking_id: 'BK-789',           // ← Safe
    amount: 8025,                   // ← Safe (amount only)
    currency: 'THB',                // ← Safe
    stripe_charge_id: 'ch_1234'     // ← Safe (for reconciliation)
  });
  
  // ✗ Never include user credit card details
  // ✗ Never log full Stripe response (may contain sensitive data)
};
```

---

## 8. EMPLOYEE ACCESS CONTROL

### Who Can Access Analytics Data?

| Role | GA4 Access | MySQL Access | Revenue Data | AI Signals |
|------|-----------|-------------|--------------|-----------|
| **CEO/Founder** | Full read/write | Full read/write | Full | Full |
| **Analytics Manager** | Full read/write | Full read/write | Full | Full |
| **Product Manager** | Read only (funnel, KPIs) | Limited (public tables) | Aggregated only | Read only |
| **Guide Support** | None | Limited (their own guide data) | None | None |
| **Marketing** | Read only (campaigns, traffic) | None | Aggregated only | None |
| **Contractors** | None | None | None | None |

### Access Logging

```sql
-- Log all analytics data access
CREATE TABLE analytics_access_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(50),
  accessed_table VARCHAR(100),
  query_summary VARCHAR(500),
  rows_accessed INT,
  accessed_at TIMESTAMP,
  ip_address VARCHAR(15)
);

-- Alert if:
-- - Non-authorized user accesses revenue table
-- - Exporting > 10K rows
-- - Accessing user_id_hashed with identifiable info
-- - Access outside business hours
```

---

## 9. GDPR COMPLIANCE CHECKLIST

### Required Privacy Measures

- [ ] **Data Subject Rights:**
  - [ ] User can request "export my data" → Returns user_id_hashed, bookings, events
  - [ ] User can request "delete me" → Deletes user record + hashed ID from analytics
  - [ ] User can request "don't track me" → Disables all analytics for user
  
- [ ] **Privacy Policy:**
  - [ ] Clearly explains analytics use (not hidden in legal jargon)
  - [ ] Lists specific vendors (Google Analytics)
  - [ ] Explains data retention timelines
  - [ ] Links to vendor privacy policies (Google's privacy policy, Stripe's privacy policy)
  
- [ ] **Consent:**
  - [ ] Consent banner shown on first visit
  - [ ] Can reject without accessing platform (no dark patterns)
  - [ ] Consent choice remembered (localStorage)
  
- [ ] **Data Security:**
  - [ ] All data in transit uses HTTPS/TLS
  - [ ] All data at rest is encrypted (database encryption)
  - [ ] Access logs maintained
  - [ ] Annual security audit
  
- [ ] **Data Processing Agreement:**
  - [ ] DPA signed with Google (for GA4)
  - [ ] DPA signed with Stripe (for payment data)
  - [ ] DPA signed with AWS (if hosting)

### User Request Workflow

```
User Request: "Export my data"
            ↓
Backend API endpoint: GET /api/user/export-data
            ↓
Validate user owns request (JWT auth)
            ↓
Query from tables:
  - users (name, email, created_at)
  - bookings (booking history)
  - revenue_events (purchase history)
  - ai_training_signals (hashed user events)
  - reviews (submitted reviews)
            ↓
Exclude from export:
  - user_id_hashed (not useful to user)
  - password hash (security)
  - credit card details (Stripe handles this)
            ↓
Create JSON/CSV file
  {
    "export_date": "2026-02-19",
    "user_name": "John Doe",
    "user_email": "john@example.com",
    "bookings": [...],
    "reviews": [...],
    "analytics_events": [...]
  }
            ↓
Return file to user (download)
            ↓
Send confirmation email
            ↓
Log request in audit trail
```

---

## 10. INCIDENT RESPONSE PLAN

### If Data Breach Occurs

```
Incident discovered
           ↓
1. CONTAIN: Disable access, notify affected systems
2. ASSESS: What data was exposed? How many users? How long?
3. NOTIFY: Email affected users within 24 hours (GDPR requirement)
4. INVESTIGATE: Root cause analysis, forensics
5. FIX: Patch vulnerability, enhance controls
6. REPORT: File report with relevant authorities (if required)
7. DOCUMENT: Post-mortem, improvements
```

### Breach Notification Template (Email to Users)

```
Subject: Important Security Notice - MaleBangkok Analytics Data

Dear valued member,

We discovered that analytics data was accessed due to a security 
vulnerability. Here's what you need to know:

What happened:
- Unnamed party accessed our analytics database
- Your guide booking history was potentially viewed
- Your hashed user ID was potentially viewed
- Your ACTUAL name/email/payment info was NOT exposed

What we're doing:
- We've closed the vulnerability
- We've reset all analytics session IDs
- We've notified law enforcement if required

What you should do:
- Change your password (if concerned)
- Monitor your account for suspicious activity
- Review your booking history
- Contact privacy@malebangkok.com if you have questions

We take your privacy seriously and apologize for this incident.

The MaleBangkok Team
```

---

## 11. ANALYTICS AUDIT CHECKLIST (Quarterly)

Run every quarter (Q1, Q2, Q3, Q4):

- [ ] Verify all event tracking is consent-compliant
- [ ] Check data retention policies are enforced
- [ ] Audit user access to analytics data
- [ ] Review for any unintended PII collection
- [ ] Validate Stripe reconciliation (revenue match)
- [ ] Check for orphaned user IDs (users who deleted account)
- [ ] Review AI training data for bias
- [ ] Analyze for anomalies (unusual spikes in events)
- [ ] Update privacy policy if needed
- [ ] Staff training: privacy best practices

---

## 12. TRANSPARENCY & COMMUNICATION

### Privacy Page on MaleBangkok Website

```
/privacy → Full privacy policy (human-readable, not legalese)

Key sections:
1. What data we collect (guide ID, bookings, events)
2. Why we collect it (platform improvement, fraud prevention)
3. How long we keep it (see retention schedule above)
4. Your rights (export, delete, opt-out)
5. How to contact us (privacy@malebangkok.com)
6. External partners (Google Analytics, Stripe)

Non-technical summary:
"We track button clicks and booking flows to improve the platform.
We hash user IDs so we can't identify individuals. You can opt out
anytime or delete your data. We don't sell data to third parties."
```

### Status Transparency Page

```
/analytics-status → Real-time transparency

Shows:
- Data collection status (On / Off)
- Last analytics sync time
- Any data processing errors
- Compliance dashboard (GDPR ✓, CCPA audit ✓, etc.)
- Historical uptime (analytics service uptime)
```

---

## Summary: Privacy Architecture

```
MaleBangkok Analytics = Privacy-First + Compliant

┌──────────────────────────────────────────────────────┐
│ Layer 1: Data Minimization                          │
│ - Only essential data tracked                       │
│ - No PII in events                                  │
│ - User IDs hashed before sending anywhere           │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│ Layer 2: Consent & Control                          │
│ - Consent banner on first visit                     │
│ - No tracking without consent                       │
│ - Easy opt-out at any time                          │
│ - Right to be forgotten (delete)                    │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│ Layer 3: Data Security                              │
│ - HTTPS in transit                                  │
│ - Database encryption at rest                       │
│ - Access control & audit logging                    │
│ - No credit card data stored                        │
└──────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────┐
│ Layer 4: Data Governance                            │
│ - Retention policies enforced                       │
│ - Regular audits (quarterly)                        │
│ - Incident response plan                            │
│ - DPAs with all vendors                             │
└──────────────────────────────────────────────────────┘

Result: GDPR-compliant, user-respecting analytics
```

