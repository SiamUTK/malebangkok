# PART C — Revenue Event Specification

## Booking Success Revenue Event (Critical)

### GA4 Purchase Event Payload

```javascript
// GA4 Ecommerce-Compatible Event Structure
// Fires when payment is authorized by Stripe

gtag('event', 'purchase', {
  // Transaction identifiers
  transaction_id: 'BK-789-2026-02-19',    // booking_id from database
  affiliation: 'malebangkok_platform',    // Fixed value
  
  // Financial data
  value: 8025,                            // Total with tax (in THB)
  currency: 'THB',                        // Three-letter code
  tax: 525,                               // Tax portion (525 THB @ 7%)
  shipping: 0,                            // No shipping
  coupon: 'LUXURY10',                     // If discount applied (optional)
  
  // User data (hashed)
  user_id: 'HASH_SHA256_USER_ID',        // Hash of user_id
  user_type: 'new',                      // "new" or "repeat"
  
  // Item-level detail (guide as item)
  items: [{
    item_id: 'G-123-SKU',                // guide_id used as SKU
    item_name: 'Ares',                   // Guide display name
    item_category: 'premium_guide',       // Fixed category
    item_variant: 'verified_guide',       // "verified_guide", "new_guide", "trending"
    price: 7500,                          // Base price (before tax)
    quantity: 1,                          // Always 1 for bookings
    index: 0                              // Position in items array
  }],
  
  // Platform metadata
  session_id: 'GA_SESSION_ID_AUTO',      // GA4 session ID (automatic)
  timestamp: 1708346400000,               // Event timestamp (JS time)
  
  // Custom dimensions for segmentation
  guide_rating: '4.8',                   // As string for GA4
  guide_verified: 'true',                // As string for GA4
  user_tenure_days: '365',               // Days since registration
  repeat_booking: 'false',               // Is this user's 2nd+ booking?
  booking_lead_time_days: '14'           // Days until session date
});
```

### Internal API Revenue Payload

```javascript
// Payload sent to Backend for Storage & Processing
// POST /api/analytics/revenue
// Authentication: Bearer token (JWT)

{
  // Booking identifiers
  booking_id: 'BK-789-2026-02-19',
  guide_id: 'G-123',
  user_id_hashed: 'SHA256_USER_ID_HASH',
  session_id: 'GA_SESSION_ID',
  
  // Financial breakdown
  price_base: 7500,                      // THB - guide rate
  tax_amount: 525,                       // THB - 7% VAT
  discount_amount: 0,                    // THB - promo code (if used)
  price_total: 8025,                     // Final charged amount
  
  currency: 'THB',
  
  // Session details
  session_date: '2026-02-25',            // YYYY-MM-DD (booking date)
  session_time: '15:00',                 // HH:MM (start time)
  session_duration_minutes: 90,          // Agreed duration
  
  // Payment information
  payment_method: 'stripe_card',         // "stripe_card", "stripe_bank_transfer"
  stripe_payment_intent_id: 'pi_1234567890abcdef',
  stripe_charge_id: 'ch_1234567890abcdef',
  
  // Guide metadata
  guide_name: 'Ares',
  guide_rating_avg: 4.8,
  guide_verified: true,
  guide_tenure_months: 24,
  
  // User metadata
  user_type: 'new',                      // "new" | "repeat"
  user_repeat_booking_count: 0,          // Previous bookings by this user
  user_total_lifetime_value_thb: 8025,   // Sum of all their bookings
  
  // Promo/discount
  promo_code: null,                      // If used, the code string
  promo_discount_percent: 0,             // 0-100
  
  // Timestamps
  event_timestamp_ms: 1708346400000,     // When event occurred
  created_at: '2026-02-19T10:00:00Z',    // ISO 8601
  updated_at: '2026-02-19T10:00:00Z'
}
```

### Database Storage Schema

```sql
-- Table: revenue_events
-- Purpose: Immutable log of all transactions
-- Retention: Permanent (GDPR archive)

CREATE TABLE revenue_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  
  -- Business identifiers
  booking_id VARCHAR(50) NOT NULL UNIQUE,
  guide_id VARCHAR(50) NOT NULL,
  user_id_hashed VARCHAR(64) NOT NULL,  -- SHA256 hash
  session_id VARCHAR(100),
  
  -- Financial
  price_base INT NOT NULL,              -- Minor units (7500)
  tax_amount INT NOT NULL,              -- Minor units (525)
  discount_amount INT DEFAULT 0,
  price_total INT NOT NULL,             -- Final amount
  currency VARCHAR(3) DEFAULT 'THB',
  
  -- Session
  session_date DATE NOT NULL,
  session_time TIME NOT NULL,
  session_duration_minutes INT,
  
  -- Payment
  payment_method VARCHAR(50),
  stripe_payment_intent_id VARCHAR(100),
  stripe_charge_id VARCHAR(100),
  
  -- Guide data (denormalized for reporting)
  guide_name VARCHAR(100),
  guide_rating DECIMAL(2,1),
  guide_verified BOOLEAN,
  
  -- User data
  user_type ENUM('new', 'repeat'),
  user_repeat_count INT DEFAULT 0,
  
  -- Promo
  promo_code VARCHAR(50),
  promo_discount_percent INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for fast querying
  KEY idx_guide_id (guide_id),
  KEY idx_created_date (created_at),
  KEY idx_user_hashed (user_id_hashed),
  KEY idx_stripe_charge (stripe_charge_id)
);
```

---

## Revenue Event Implementation in React

```javascript
// File: frontend/src/utils/analytics.js
// The trackRevenue function (see full code in Part D)

import { hashString } from './cryptoUtils';

export const trackRevenue = async (bookingData) => {
  try {
    // Validate required fields
    if (!bookingData.booking_id || !bookingData.price_total) {
      console.error('trackRevenue: Missing critical data', bookingData);
      return;
    }

    // Hash user ID for privacy
    const userIdHashed = bookingData.user_id 
      ? await hashString(bookingData.user_id) 
      : null;

    // 1. Send to GA4 (ecommerce structure)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: bookingData.booking_id,
        value: bookingData.price_total,
        currency: 'THB',
        items: [{
          item_id: bookingData.guide_id,
          item_name: bookingData.guide_name,
          price: bookingData.price_base,
          quantity: 1
        }],
        user_id: userIdHashed,
        guide_rating: String(bookingData.guide_rating),
        guide_verified: String(bookingData.guide_verified),
        user_type: bookingData.user_type
      });
    }

    // 2. Send to Internal API (async, non-blocking)
    if (process.env.REACT_APP_ANALYTICS_API_ENABLED === 'true') {
      const payload = {
        booking_id: bookingData.booking_id,
        guide_id: bookingData.guide_id,
        user_id_hashed: userIdHashed,
        price_base: bookingData.price_base,
        tax_amount: bookingData.tax_amount,
        price_total: bookingData.price_total,
        currency: 'THB',
        session_date: bookingData.session_date,
        session_time: bookingData.session_time,
        guide_name: bookingData.guide_name,
        guide_rating_avg: bookingData.guide_rating,
        user_type: bookingData.user_type,
        created_at: new Date().toISOString()
      };

      // Fire and forget (don't await)
      fetch(`${process.env.REACT_APP_API_URL}/analytics/revenue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(payload)
      }).catch(err => console.warn('Analytics API error:', err));
    }

  } catch (error) {
    // Fail silently - don't break payment flow
    console.warn('Revenue tracking failed:', error);
  }
};
```

---

## Revenue Event Triggering Sequence

### Payment Success Flow (from Backend)

```
1. Stripe Webhook Received (/api/webhooks/stripe)
      ↓
2. Validate webhook signature & charge
      ↓
3. Update booking table: status = 'confirmed'
      ↓
4. Create entry in revenue_events table
      ↓
5. Send success notification to frontend:
     {
       status: 'success',
       booking_id: 'BK-789',
       stripe_charge_id: 'ch_1234567890'
     }
      ↓
6. Frontend (Payment.jsx) receives confirmation
      ↓
7. Frontend calls trackRevenue({
     booking_id: 'BK-789',
     guide_id: 'G-123',
     user_id: userId,
     price_total: 8025,
     ...
   })
      ↓
8. GA4 event: purchase
   Internal API: POST /api/analytics/revenue
      ↓
9. Both log stored for reconciliation
      ↓
10. Dashboard updates in real-time:
    "Revenue today: ฿1,234,567"
    "Average order value: ฿8,025"
    "Top guide: Ares (15 bookings, ฿120,375 revenue)"
```

---

## Critical Implementation Checklist

### ✓ MUST DO:
- [ ] Revenue event fires AFTER payment authorization confirmed
- [ ] booking_id is unique and immutable
- [ ] user_id is hashed (SHA256) before sending anywhere
- [ ] GA4 and Internal API receive same booking_id for reconciliation
- [ ] price includes tax (price_total = amount charged to card)
- [ ] All timestamps are UTC
- [ ] Stripe charge_id is captured and stored
- [ ] Revenue events are logged to MySQL permanently

### ✗ NEVER:
- [ ] Send unencrypted user email/name/phone to GA4
- [ ] Track revenue before payment confirmed
- [ ] Log duplicate events (deduplication by booking_id)
- [ ] Fail payment if analytics call fails
- [ ] Include user ID (raw) in any event

### ⚠ RECONCILIATION:
```javascript
// Daily reconciliation report:
// Stripe charges ($) vs GA4 purchases vs Internal revenue_events
// Should match 100%

SELECT
  COUNT(*) as stripe_charge_count,
  SUM(amount) as stripe_total,
  date(created) as date
FROM stripe_charges
WHERE type = 'charge'
GROUP BY date;

-- Compare to:
SELECT
  COUNT(*) as ga4_purchase_count,
  SUM(price_total/100) as ga4_total,
  DATE(created_at) as date
FROM revenue_events
GROUP BY date;

-- Should be identical. If not: investigate missing events
```

