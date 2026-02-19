# Conversion KPI & Experimentation Roadmap

## 1. CORE FUNNEL METRICS

### Funnel Definition:
```
Visitor (Session)
     ↓ (~80% conversion)
Browse Page (Home/Discovery)
     ↓ (~25% conversion)
Guide Profile Click
     ↓ (~60% conversion)
Start Booking (Click CTA)
     ↓ (~85% conversion)
Enter Booking Details
     ↓ (~88% conversion)
Proceed to Payment
     ↓ (~98% conversion)
Payment Confirmation
     ↓ (follow-up booking within 30 days)
Repeat User
```

### Key Performance Indicators (KPIs)

| Funnel Stage | Metric | Current Est. | Target | Owner |
|--------------|--------|----------|--------|-------|
| **Discovery** | Session CTR (Home → Browse) | 60% | 80% | Product |
| **Browse** | Card CTR (List → Profile) | 25% | 35% | Product/Design |
| **Profile** | Booking CTA CTR (Profile → Booking Start) | 40% | 60% | Product/Copy |
| **Booking** | Form Completion Rate | 70% | 85% | Product |
| **Payment** | Payment Success Rate | 92% | 96% | Product/Payments |
| **Conversion** | Booking Completion Rate | 58% | 75% | Product/All |
| **Retention** | Repeat Booking Rate (30 days) | 18% | 35% | Growth/Product |

### Benchmark Targets:

| Scenario | Target CTR | Target Conversion |
|----------|-----------|------------------|
| Luxury marketplace (tourism) | 3-5% | 2-3% |
| Premium services (dates/events) | 2-4% | 1-2% |
| MaleBangkok ambitious target | 4-6% | 2-3% |

---

## 2. METRICS ANATOMY & THRESHOLDS

### Click-Through Rate (CTR) - Measurement

**Primary Metric: Card CTR**
```
Card CTR = (Guide Profile Clicks) / (Cards Shown) × 100
```

**Frequency:** Daily
**Dashboard:** Live (check hourly during campaigns)
**Alert:** If CTR drops > 10% from baseline

**Baseline Goals:**
- Week 1: Establish baseline (current = 25%)
- Optimize GuideCard: Target 30-35% by Week 4
- Premium messaging: Target 35-40% by Week 8

**What Affects Card CTR:**
- Card design (improved GuideCard = +25%)
- Guide quality/rating (high ratings = +30%)
- Scarcity signals ("Trending," "Frequently booked" = +15%)
- Trust badges (verified status = +10%)
- Price anchoring (knowing baseline = +5%)

---

### Form Completion Rate (Conversion)

**Primary Metric: Booking Form Completion**
```
Form Completion = (Form Submitted Successfully) / (Form Started) × 100
```

**Frequency:** Daily
**Target:** 85% (from 70%)
**Improvement Lever:** Field reduction (each field = -5% completion)

**How to Track:**
```javascript
// Step 1: User clicks "Reserve"
gtag('event', 'booking_form_started', {
  guide_id: guideId,
  guide_name: guideName,
  price: price,
  timestamp: Date.now()
});

// Step 2: User fills Date/Time
gtag('event', 'booking_step_1_completed', {
  guide_id: guideId,
  timestamp: Date.now()
});

// Step 3: User fills Email/Requests
gtag('event', 'booking_step_2_completed', {
  guide_id: guideId,
  timestamp: Date.now()
});

// Step 4: User submits form
gtag('event', 'booking_form_completed', {
  guide_id: guideId,
  total_price: price,
  timestamp: Date.now()
});

// If user abandons:
gtag('event', 'booking_form_abandoned', {
  guide_id: guideId,
  last_step: 'step_2_email',  // abandoned at email field
  time_spent_seconds: elapsed,
  timestamp: Date.now()
});
```

**Dashboard Alert:** If completion drops below 80%, investigate that day's issues.

---

### Payment Success Rate

**Primary Metric: Payment Authorization Success**
```
Payment Success = (Successful Charges) / (Payment Attempts) × 100
```

**Frequency:** Real-time
**Target:** 96% (from 92%)
**What Causes Failures:**
- Card declined (insufficient funds, fraud block)
- Network timeout (rare)
- Invalid card data (user error)
- Stripe outage (very rare)

**How to Track:**
```javascript
// Successful payment
gtag('event', 'payment_success', {
  guide_id: guideId,
  amount: price,
  payment_method: 'card',
  timestamp: Date.now()
});

// Failed payment
gtag('event', 'payment_failed', {
  guide_id: guideId,
  amount: price,
  error_code: 'card_declined',  // or 'timeout', 'invalid_data'
  timestamp: Date.now()
});
```

---

### Booking Completion Rate

**Primary Metric: End-to-End Conversion**
```
Booking Completion = (Paid Bookings) / (Sessions) × 100
```

**Frequency:** Daily
**Current Estimate:** 0.58% (58 bookings per 10K visitors)
**Target:** 1.5-2% (150-200 bookings per 10K visitors)

**Calculation:**
- 10,000 visitors → 8,000 browse (80% CTR Home) → 2,800 click profile (35% CTR) → 1,680 start booking (60% CTA clicked) → 1,428 enter details (85% form) → 1,256 complete form (88%) → 1,251 pay → 1,251 / 10,000 = **12.5% booking rate**

**This assumes full optimization.** More realistic phased rollout:
- Week 1-2: 0.8% (baseline)
- Week 3-4: 1.2% (card + hero optimizations)
- Week 5-8: 1.8% (booking flow + trust layer)

---

## 3. CONVERSION OPTIMIZATION A/B TEST ROADMAP

### Phase 1: Hero & Discovery (Week 1-2)

**Test 1A: Hero Headline**
- Control: "MaleBangkok Premium Male Therapy & Elite Lifestyle"
- Variant A: "Private Moments with Verified Elite Guides. Your Discretion Protected."
- Metric: Home → Browse CTR
- Sample Size: 5,000 sessions per variant
- Duration: 7 days
- Hypothesis: Benefit-driven headline increases interest

**Test 1B: Primary CTA Copy**
- Control: "Explore Guides"
- Variant A: "Reserve Your Private Experience"
- Variant B: "Start Your Perfect Match"
- Metric: Hero CTA click-through rate
- Sample Size: 3,000 sessions per variant
- Duration: 7 days
- Hypothesis: Exclusivity language increases conversion

**Expected Outcome:** +15-20% improvement to Hero CTR

---

### Phase 2: Card & Discovery (Week 3-4)

**Test 2A: GuideCard Design**
- Control: Current GuideCard (basic)
- Variant A: Enhanced GuideCard (NEW - with badges, scarcity, save button)
- Metric: Guide Profile Click Rate
- Sample Size: 10,000 card impressions per variant
- Duration: 14 days
- Hypothesis: Premium card design + trust badges increase CTR 25-30%

**Test 2B: Card Sorting**
- Control: Sort by "Random" or "Featured"
- Variant A: Sort by "Verified First" (all verified at top)
- Variant B: Sort by "Top Rated" (highest rating first)
- Metric: First-card CTR (cards above fold)
- Sample Size: Daily sessions
- Duration: 7 days
- Hypothesis: Verified-first sorting increases click rate by 20%

**Expected Outcome:** +20-25% improvement to Card CTR

---

### Phase 3: Booking Flow (Week 5-6)

**Test 3A: Form Field Count**
- Control: 8 fields (date, time, duration, service, requests, email, phone, notes)
- Variant A: 5 fields (date, time, email, requests, payment type)
- Variant B: 3 fields (date, time, email only)
- Metric: Form completion rate, conversion rate
- Sample Size: 100+ form starts per variant
- Duration: 14 days
- Hypothesis: Fewer fields = higher completion (+15%)

**Test 3B: Trust Message Placement**
- Control: Privacy message at bottom
- Variant A: Privacy message right side of email field
- Variant B: Privacy badge inline with first field
- Metric: Form drop-off rate at email field
- Sample Size: 50+ form starts per variant
- Duration: 7 days
- Hypothesis: Early trust messaging prevents abandon

**Expected Outcome:** +15-20% form completion rate

---

### Phase 4: Checkout & Payment (Week 7-8)

**Test 4A: Payment CTA Copy**
- Control: "Confirm Booking"
- Variant A: "Reserve & Pay THB 8,025"
- Variant B: "Secure Your Private Session"
- Metric: Payment submission rate, payment success rate
- Sample Size: 50+ payment attempts per variant
- Duration: 7 days
- Hypothesis: Amount-specific CTA reduces hesitation

**Test 4B: Guarantee Message**
- Control: No guarantee shown
- Variant A: "60-Day Satisfaction Guarantee" above button
- Variant B: "Full Refund within 24 Hours" above button
- Metric: Payment success rate
- Sample Size: 50+ payments per variant
- Duration: 7 days
- Hypothesis: Guarantee removes final purchase anxiety

**Expected Outcome:** +5-8% payment success rate

---

### Phase 5: Experience & Retention (Week 9-10)

**Test 5A: Confirmation Email**
- Control: Simple confirmation text
- Variant A: Detailed guide profile + "Next Steps"
- Variant B: Personalized message + "Chat with Guide"
- Metric: Email open rate, click-through rate
- Sample Size: 50+ emails per variant
- Duration: 7 days
- Hypothesis: Richer email increases post-booking confidence

**Test 5B: Reminder System**
- Control: 1 reminder (24 hours before)
- Variant A: 2 reminders (24 hours + 2 hours before)
- Variant B: 3 reminders + in-app notification
- Metric: Session attendance rate, guide no-show rate
- Sample Size: 30+ sessions per variant
- Duration: 14 days
- Hypothesis: Multiple reminders reduce no-show rate

**Expected Outcome:** +10% session completion rate, -20% no-show rate

---

## 4. GA4 EVENT TRACKING SPECIFICATION

### Event Naming Convention:
```
event_category_action

Examples:
- discover_home_view (viewed home page)
- discover_card_click (clicked guide card)
- booking_form_start (clicked "Reserve" CTA)
- booking_field_fill (filled date field)
- payment_success (payment authorized)
```

### Core Events to Implement:

#### Discovery Events
```javascript
// User viewed home page
gtag('event', 'discover_home_view', {
  session_source: 'organic',  // or 'paid', 'referral'
  device_type: 'mobile',
  timestamp: Date.now()
});

// User viewed guide list
gtag('event', 'discover_list_view', {
  guide_count: 24,  // cards shown
  filters_applied: ['verified', 'rating_4_5'],
  timestamp: Date.now()
});

// User clicked guide card
gtag('event', 'discover_card_click', {
  guide_id: 123,
  guide_name: 'Ares',
  guide_rating: 4.8,
  guide_verified: true,
  price: 7500,
  card_position: 1,  // position in grid
  timestamp: Date.now()
});

// User saved guide (wishlist)
gtag('event', 'discover_guide_save', {
  guide_id: 123,
  guide_name: 'Ares',
  timestamp: Date.now()
});
```

#### Booking Events
```javascript
// User clicked main CTA
gtag('event', 'booking_cta_click', {
  cta_text: 'Reserve Your Private Experience',
  page: 'guide_profile',
  guide_id: 123,
  timestamp: Date.now()
});

// User started booking form
gtag('event', 'booking_form_start', {
  guide_id: 123,
  guide_name: 'Ares',
  price: 7500,
  timestamp: Date.now()
});

// User completed step 1 (date/time)
gtag('event', 'booking_step_1_complete', {
  guide_id: 123,
  selected_date: '2026-02-20',
  selected_time: '15:00',
  time_to_complete: 45,  // seconds
  timestamp: Date.now()
});

// User filled special requests
gtag('event', 'booking_step_2_complete', {
  guide_id: 123,
  has_special_requests: true,
  email: 'user@example.com',
  time_to_complete: 30,
  timestamp: Date.now()
});

// User abandoned form
gtag('event', 'booking_form_abandon', {
  guide_id: 123,
  last_step_completed: 'step_1',  // or 'step_2', 'payment'
  reason: 'form_submission_error',  // or 'user_navigated_away'
  time_spent: 120,  // seconds
  timestamp: Date.now()
});
```

#### Payment Events
```javascript
// User viewed payment page
gtag('event', 'payment_view', {
  guide_id: 123,
  amount: 8025,  // includes tax
  currency: 'THB',
  timestamp: Date.now()
});

// Payment successful
gtag('event', 'payment_success', {
  guide_id: 123,
  amount: 8025,
  payment_method: 'stripe_card',
  card_brand: 'visa',
  booking_id: 'BK-456',
  transaction_id: 'ch_1234567890',
  timestamp: Date.now()
});

// Payment failed
gtag('event', 'payment_failed', {
  guide_id: 123,
  amount: 8025,
  error_code: 'card_declined',  // or 'timeout', 'invalid_card'
  error_message: 'Your card was declined',
  timestamp: Date.now()
});
```

#### Confirmation Events
```javascript
// Booking confirmed and email sent
gtag('event', 'booking_confirmed', {
  guide_id: 123,
  booking_id: 'BK-456',
  amount_paid: 8025,
  session_date: '2026-02-20',
  session_time: '15:00',
  timestamp: Date.now()
});

// User viewed confirmation page
gtag('event', 'confirmation_page_view', {
  booking_id: 'BK-456',
  guide_id: 123,
  timestamp: Date.now()
});

// User downloaded calendar event
gtag('event', 'confirmation_calendar_download', {
  booking_id: 'BK-456',
  calendar_type: 'ics',  // or 'google_calendar'
  timestamp: Date.now()
});
```

#### Retention Events
```javascript
// User is repeat user (booked before)
gtag('event', 'user_repeat_check', {
  is_repeat_user: true,
  previous_bookings_count: 3,
  days_since_last_booking: 28,
  timestamp: Date.now()
});

// User left review
gtag('event', 'review_submitted', {
  booking_id: 'BK-456',
  guide_id: 123,
  rating: 5,
  review_length: 150,  // characters
  timestamp: Date.now()
});

// User booked same guide again
gtag('event', 'repeat_booking_guide', {
  guide_id: 123,
  repeat_count: 2,  // 2nd booking with this guide
  days_between_bookings: 14,
  timestamp: Date.now()
});
```

---

## 5. DASHBOARD & REPORTING

### Daily Executive Dashboard (9 AM)
```
┌────────────────────────────────────────────────┐
│ MaleBangkok Conversion Dashboard (Yesterday)   │
├────────────────────────────────────────────────┤
│                                                │
│ Sessions:              1,245 ↑ 5% WoW           │
│ Profile Views:         312 (25% CTR) ↑ 3%      │
│ Bookings Started:      187 (60% of profiles)   │
│ Forms Completed:       159 (85% completion)    │
│ Payments Attempted:    156                     │
│ Payments Successful:   153 (98% success rate)  │
│ Total Revenue:         ฿1,224,225 ↑ 8% WoW     │
│                                                │
│ Funnel Conversion:     12.3% (sessions→booking)│
│ Repeat Bookings:       18 (11.8% repeat rate)  │
│                                                │
└────────────────────────────────────────────────┘
```

### Weekly Review Checklist
- [ ] Preview funnel metrics (conversion, CTR, completion)
- [ ] Identify > 10% drops in any metric (investigate)
- [ ] Note guide performance variations (feedback to guides)
- [ ] Check repeat booking rate (retention health)
- [ ] Review A/B test winner(s) and plan next test
- [ ] Analyze user feedback (form abandonment reasons)

---

## 6. SUCCESS METRICS & TARGETS

### Month 1: Baseline & Quick Wins
- [ ] Funnel conversion: 1.0% (from 0.58%)
- [ ] Card CTR: 28% (from 25%)
- [ ] Form completion: 78% (from 70%)
- [ ] Payment success: 93% (from 92%)
- [ ] Repeat booking: 20% (from 18%)

### Month 2: Optimization Compound
- [ ] Funnel conversion: 1.5% (+50%)
- [ ] Card CTR: 32% (new card design)
- [ ] Form completion: 83% (field reduction)
- [ ] Payment success: 95%
- [ ] Repeat booking: 28%
- [ ] AOV (average order value): ฿8,100 (from ฿7,600)

### Month 3: Mature Funnel
- [ ] Funnel conversion: 2.0% (goal)
- [ ] Card CTR: 35%+ (verified-first sorting)
- [ ] Form completion: 85% (optimized flow)
- [ ] Payment success: 96%
- [ ] Repeat booking: 35%
- [ ] Revenue per visitor: ฿166 (from ฿44)

---

## 7. EXPERIMENTATION BUDGET

**Testing Timeline: 10 weeks**

| Week | Phase | Test Cost | Primary Metric | Expected Lift |
|------|-------|-----------|----------------|---------------|
| 1-2 | Hero & Discovery | Free | Home CTR | +15% |
| 3-4 | Card & Sorting | Free | Card CTR | +25% |
| 5-6 | Booking Flow | Free | Form completion | +15% |
| 7-8 | Payment & Trust | Free | Payment success | +5% |
| 9-10 | Retention & Email | Free | Repeat rate | +15% |

**Total Expected Lift: +50-70% improvement to overall conversion**

---

## 8. TOOLS & INFRASTRUCTURE

**GA4 Setup Required:**
- [ ] Google Analytics 4 property created
- [ ] Custom events configured (see 4 above)
- [ ] Conversion events marked (booking confirmation = conversion)
- [ ] Event-based audiences created (repeat users, high-value)
- [ ] User ID tracking enabled (cross-session)

**A/B Testing Tools:**
- [ ] Google Optimize (free, integrates with GA4)
- [ ] OR: VWO / Optimizely (paid, more advanced)
- [ ] OR: PostHog (open-source, self-hosted)

**Email & Retention Tools:**
- [ ] Brevo or SendGrid (transactional emails)
- [ ] Segment (event collection hub)
- [ ] Mixpanel (advanced funnel analysis)

---

## SUMMARY: CRO Roadmap

**Week 1-2:** Establish baselines, launch hero test  
**Week 3-4:** Optimize card design, test sorting  
**Week 5-6:** Simplify booking flow  
**Week 7-8:** Strengthen payment reassurance  
**Week 9-10:** Focus on retention & repeat  

**Expected Outcome:** 2%+ end-to-end conversion rate (3-4x improvement)

**Success Indicator:** Average guide books 8-10 sessions/week (from 3-4 currently)
