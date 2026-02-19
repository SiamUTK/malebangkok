# PART G — KPI Dashboard Design & Monitoring Blueprint

## MaleBangkok Executive Analytics Dashboard

---

## 1. PRIMARY KPI DEFINITIONS

### Tier 1: Revenue KPIs (Measure Revenue Impact)

#### KPI: Total Revenue

```
Definition: Sum of all completed bookings (after payment confirmed)
Formula: SUM(revenue_events.price_total) WHERE created_at = TODAY
Frequency: Real-time (updated every 5 minutes)
Target: ฿1,500,000/day (scaling from ฿500K baseline)
Benchmark: Luxury services typically see 10-20% month-over-month growth
Alert: If daily revenue < 80% of 7-day average, investigate

Status Dashboard:
  Today: ฿847,250 ↓ (as of 10:45 PM)
  7-day avg: ฿1,123,450
  30-day total: ฿33.7M (↑ 15% vs last month)
  YTD: ฿156.3M (on track for ฿1.8B annual)
```

#### KPI: Average Order Value (AOV)

```
Definition: Average price per booking (including tax)
Formula: SUM(revenue_events.price_total) / COUNT(revenue_events.booking_id)
Frequency: Daily
Target: ฿8,500+ (from baseline ฿7,800)
Why it matters: Higher AOV = better unit economics, less volume needed

Status Dashboard:
  Today: ฿8,342
  7-day avg: ฿8,156
  Month ago: ฿7,643
  ↑ 8.1% month-over-month (good trend)

What drives AOV:
  - Premium guide pricing (guide_tier = 'elite')
  - Longer session durations (2h vs 1h)
  - Bundle bookings (multi-session)
  - Seasonal pricing
```

#### KPI: Revenue per Visitor (RPV)

```
Definition: Total daily revenue / total daily sessions
Formula: revenue_today / sessions_today
Frequency: Daily
Target: ฿168 per visitor (from ฿44 baseline)
Benchmark: Luxury marketplaces: ฿100-250 per visitor

Calculation example:
  Revenue today: ฿847,250
  Sessions today: 5,234
  RPV: ฿847,250 / 5,234 = ฿161.87 per visitor ✓ (On target)

Month-over-month:
  Jan: ฿44 → Feb: ฿89 → Mar (projected): ฿168 ✓

This is the most important metric. It captures:
  - Traffic quality (more visitors = higher denominator = lower RPV)
  - Conversion efficiency (more bookings = higher numerator)
  - Pricing optimization (AOV improvement = higher numerator)
```

---

### Tier 2: Conversion KPIs (Measure Funnel Health)

#### KPI: Overall Booking Conversion Rate

```
Definition: (Successful bookings / Total sessions) × 100
Formula: COUNT(booking_success events) / COUNT(sessions)
Frequency: Daily
Current: 0.58% (58 bookings per 10,000 visitors)
Target: 2.0% (200 bookings per 10,000 visitors)
Benchmark: Luxury services: 1.5-2.5%

Timeline to Target (with optimizations):
  Week 1: 0.8% (quick wins)
  Week 4: 1.2% (card + hero optimization)
  Week 8: 1.8% (booking flow + trust)
  Week 12: 2.0% (mature optimization)

If conversion < 0.5%: ALERT
  - Check: Guide list page load time
  - Check: Booking form errors
  - Check: Payment auth failures
```

#### KPI: Guide Card CTR (Click-Through Rate)

```
Definition: (Guide profile clicks / Cards shown) × 100
Formula: COUNT(click_guide_card) / COUNT(card_impressions)
Frequency: Real-time (every hour)
Baseline: 25%
Target: 35%+ (after card redesign, trust badges, scarcity signals)

Segment by:
  - Device: Mobile (22%) vs Desktop (28%) → Mobile friction
  - Guide quality: 5-star guides (38%) vs 3-star (15%)
  - Card position: Position 1 (32%) vs Position 24 (18%)
  - List context: Recommended (35%) vs Search (22%)

Alert thresholds:
  🔴 If daily CTR < 20%: Card design issue or guide quality dropped
  🟡 If CTR drops > 10% from baseline: Investigate immediately
  
Weekly target:
  Mon-Tue: 26-28% (lower traffic)
  Wed-Fri: 28-32% (peak demand)
  Sat-Sun: 30-34% (leisure searches)
```

#### KPI: Profile-to-Booking CTR

```
Definition: (Booking started / Profile views) × 100
Formula: COUNT(click_book_button) / COUNT(view_guide_profile)
Frequency: Daily
Baseline: 40%
Target: 60%+

What affects this:
  ↑ High ratings (4.8+ stars = 65% CTR)
  ↑ Recent reviews (3+ reviews in last 30 days = +20%)
  ↑ Verified status (verified guides = 15% CTR bonus)
  ↓ High price (each +100฿ = -2% CTR)
  ↓ Few reviews (<3 total, =30% CTR)
  ↓ Availability issues (next opening 30+ days = -25%)

Alert: If any guide's profile CTR drops from 50% to 30%, 
       review for quality issues (bad new reviews, photos removed, availability)
```

#### KPI: Form Completion Rate

```
Definition: (Forms submitted / Forms started) × 100
Formula: COUNT(submit_booking_form) / COUNT(start_booking)
Frequency: Daily
Baseline: 70%
Target: 85%+
Benchmark: Normal form completion: 70-80%, Optimized: 85%+

Fields currently in form: 8
  - Select date
  - Select time
  - Select duration
  - Service type
  - Special requests
  - Email
  - Phone
  - Notes

Optimization lever: Reduce to 5 fields (goal for Week 5)
  Expected impact: 70% → 80% completion (not 85%, but progress)

Completion by step:
  Step 1 (date + time): 95% complete → 5% abandon
  Step 2 (email + requests): 75% complete ← HIGH FRICTION
  Step 3 (review + pay): 95% complete → proceed to payment

Action: Redesign Step 2
  - Move phone to optional field
  - Add trust message (Privacy assured)
  - Better error messages
```

#### KPI: Payment Success Rate

```
Definition: (Successful charges / Payment attempts) × 100
Formula: COUNT(booking_success) / COUNT(booking_confirmation)
Frequency: Real-time (check every 30 min)
Baseline: 92%
Target: 96%+
Benchmark: Industry standard: 92-98%

Failure reasons:
  - Card declined (70% of failures) → User issue
  - Timeout (15%) → Network issue
  - Form validation error (12%) → UX issue
  - Fraud block (3%) → Stripe decision

Alert thresholds:
  🔴 < 90%: Investigate immediately (payment system issue?)
  🟡 Drop > 5%: Check Stripe error logs
  
Weekly monitoring:
  Mon: 94%
  Tue: 93%
  Wed-Sun: 94-95%
  
If payment success keeps dropping 91-92%:
  → Consider payment form UX testing
  → Add guaranteed messaging ("Safe, secure checkout")
```

---

### Tier 3: Retention & Growth KPIs

#### KPI: Repeat Booking Rate (30-Day)

```
Definition: (Users who booked 2+ times within 30 days / Total users) × 100
Formula: COUNT(repeat_users_30d) / COUNT(all_users_30d)
Frequency: Weekly (calculated on Sunday)
Baseline: 18%
Target: 35%+
Why it matters: Repeat users = LTV growth and guide loyalty

Calculation:
  Week of Feb 12-18:
    New users: 3,247
    Repeat bookings (from same cohort): 584
    Repeat rate: 584/3,247 = 17.99% ≈ 18%

Segment by:
  - New guide (first 30 days): 5% repeat (low expected)
  - Mature guide (100+ bookings): 45% repeat (high quality)
  - Verified guides: 28% repeat vs non-verified 12%
  - High-rated (4.7+): 40% repeat vs low-rated (3.5-): 8%

By geography:
  - Bangkok: 22% repeat
  - Phuket: 18% repeat
  - Chiang Mai: 14% repeat
  
Action if low:
  - Send email campaign: "Book this guide again 15% off"
  - Push notification: "Ares is available this weekend"
  - Wishlist follow-up: "Your saved guides are available"
```

#### KPI: Revenue per Guide

```
Definition: Monthly revenue generated by single guide
Formula: SUM(revenue_events.price_total) WHERE guide_id = X AND month = THIS_MONTH
Frequency: Daily (but reported weekly)
Benchmark: 
  New guide (0-30 bookings): ฿20K-50K/month
  Mature guide (100+ bookings): ฿250K-500K/month
  Elite guide (500+ bookings): ฿1M+/month

Top guides this month:
  1. Ares: ฿487,250 (87 bookings)
  2. Marco: ฿423,150 (71 bookings)
  3. Dimitri: ฿385,900 (68 bookings)
  ...
  25. NewGuide: ฿12,450 (2 bookings)

What to watch:
  ↑ If guide revenue drops 30%+ from previous month: quality issue?
  ↓ If new guide hasn't hit ฿10K by Day 30: low demand / bad photos?
  
Yearly projections (based on Feb):
  Ares: ฿487K/month → ฿5.84M/year
```

---

## 2. SECONDARY KPIs (Diagnostic Metrics)

### Engagement KPIs

| KPI | Baseline | Target | Check If |
|-----|----------|--------|----------|
| Avg time on profile (seconds) | 84 | 120+ | Low = vague guide description, poor photos |
| Scroll depth on profile (%) | 62 | 75+ | Low = content below fold not seen |
| Review engagement rate (%) | 65 | 75+ | Low = review design unclear |
| Mobile CTR (%) | 22 | 30+ | Mobile-specific friction |
| Desktop CTR (%) | 28 | 38+ | Desktop design issue |
| Wishlist save rate (%) | 5.2 | 12+ | Low confidence in guides or unclear CTA |
| Repeat matching tool clicks (%) | 1.8 | 5+ | Algorithm not helping users find guides |

### Quality KPIs

| KPI | Definition | Alert Threshold |
|-----|-----------|-----------------|
| Guide no-show rate | (No-shows / Booked sessions) × 100 | > 5% = investigate guide |
| User no-show rate | (No-shows by users / Bookings) × 100 | > 3% = fraud signal |
| Refund rate | (Refunds / Total bookings) × 100 | > 2% = quality issue |
| Cancellation rate | (Canceled / Confirmed) × 100 | > 3% = booking friction |
| Avg review rating | Mean of all submitted reviews | < 4.0 = quality crisis |
| Response time (hours) | Guide → User message response | > 2h = slow communication |

---

## 3. ALERT THRESHOLDS & ESCALATION

### Real-Time Alerts (Check Every 30 Minutes)

```
Critical Alerts 🔴 (Page On-Call Engineer)

1. Daily Revenue < 80% of 7-day average
   Alert: "Daily revenue ฿652K is 42% below average ฿1.12M"
   Action: Check payment processing, guide availability
   
2. Payment Success Rate < 90%
   Alert: "Payment auth success dropped to 87%"
   Action: Check Stripe dashboard, contact payment provider
   
3. Form Error Rate > 5%
   Alert: "5.2% of booking forms are failing to submit"
   Action: Check server logs, database errors
   
4. Guide unavailability (top guide offline)
   Alert: "Ares offline for 3+ hours, lost 5 potential bookings"
   Action: Check if guide account compromised or system error

5. Conversion rate drops > 30%
   Alert: "Booking conversion 0.38% (normally 0.58%)"
   Action: Check for site issues, payment errors, outages
```

### Elevated Alerts 🟡 (Check Every 1-4 Hours)

```
1. Card CTR drops > 10%
   Alert: "Guide Card CTR is 23% (normal 27%)"
   Possible causes:
     - Reduced traffic quality (more bot/low-intent visitors?)
     - Guide reputation issue (new bad reviews?)
     - Card design change rolled out?
   Action: Segment data, investigate cause

2. Form completion > 25% above guide CTR
   Alert: "Card CTR 25% but form completion 55% - friction above fold?"
   Action: Check mobile vs desktop split
   
3. Repeat booking rate drops
   Alert: "7-day repeat rate 16% (normally 20%)"
   Action: Check recent guide quality issues, new reviews
   
4. Email open rate < 15%
   Alert: "Booking confirmation emails: 12% open rate"
   Action: A/B test subject line, check spam folder delivery
```

### Informational Alerts 🟢 (Daily Report)

```
1. Guide performance shifts
   - Ares drops from #1 to #3 in revenue
   - New guide hits ฿40K in Week 1 (excellent start)
   
2. Weekly trends
   - Matching tool CTR trending up (good algorithm)
   - Mobile traffic now 45% (mobile optimization paying off)
   
3. Upcoming optimization windows
   - Test A/B ready to launch Wednesday
   - Weekend booking surge expected Saturday
```

---

## 4. DASHBOARD LAYOUTS

### Executive Dashboard (CEO/Board View)

```
┌───────────────────────────────────────────────────────────────────┐
│          MALEBANGKOK EXECUTIVE DASHBOARD                          │
│                    Feb 19, 2026 | 10:45 PM                        │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  KEY METRICS TODAY:                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │ Revenue      │  │ Bookings     │  │ Conversion   │            │
│  │ ฿847,250 🟢  │  │ 102 sessions │  │ 0.58% units  │            │
│  │ ↓ 8% vs avg  │  │ ↑ 4% vs avg  │  │ ↓ 6% vs goal │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                   │
│  TRAILING PERFORMANCE:                                           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                                                             │ │
│  │  7-Day Revenue:  ฿7.86M  ↑ 12% week-over-week              │ │
│  │  30-Day Revenue: ฿33.7M  ↑ 15% month-over-month             │ │
│  │  YTD Revenue:    ฿156.3M → ฿1.83B annual projection         │ │
│  │                                                             │ │
│  │  Card CTR:       27%  ← TARGET: 35% by Mar 31              │ │
│  │  Form Complete:  73%  ← TARGET: 85% by Mar 31              │ │
│  │  Pay Success:    94%  ← TARGET: 96% by Apr 30              │ │
│  │  Repeat Rate:    18%  ← TARGET: 35% by June 30             │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  TOP PERFORMERS:                                                 │
│  Guide         Revenue    Bookings  Rating  Status               │
│  ─────────────────────────────────────────────────────────────   │
│  Ares          ฿487.2K      87       4.9     ✓ Verified         │
│  Marco         ฿423.2K      71       4.7     ✓ Verified         │
│  Dimitri       ฿385.9K      68       4.8     ✓ Verified         │
│  ...                                                             │
│                                                                   │
│  ALERTS:                                                         │
│  ⚠ Form completion dropped to 71% (normally 75%)               │
│  ⚠ Mobile CTR 20% (target 30%)                                 │
│  ✓ Payment success rate stable at 94%                          │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### Conversion Funnel Dashboard (Product Manager View)

```
┌───────────────────────────────────────────────────────────────────┐
│       CONVERSION FUNNEL DASHBOARD                                 │
│       Live Data | Feb 19, 2026                                   │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Funnel Breakdown (Today):                                       │
│                                                                   │
│  [1] Sessions Entered          5,234  100%                       │
│      │                                                           │
│      └─→ [2] Browsed Guides    4,187  80% ↑✓ (Target: 80%)      │
│             │                                                    │
│             └─→ [3] Viewed Profile  1,171  28% ↓⚠ (Target: 35%)  │
│                    │                                             │
│                    └─→ [4] Clicked Book  702  60% ✓ (Target: 60%)  │
│                           │                                      │
│                           └─→ [5] Started Form  597  85% ✓        │
│                                  │                               │
│                                  └─→ [6] Submitted  436  73% ⚠   │
│                                         │          (Target: 85%) │
│                                         │                        │
│                                         └─→ [7] Paid  418  96% ✓  │
│                                                │ (Target: 96%)    │
│                                                │                  │
│                                                └─→ [8] Confirmed  │
│                                                     102 sessions  │
│                                                                   │
│  End-to-End Conversion: 102 / 5,234 = 1.95% ✓ (Close to 2% goal) │
│                                                                   │
│  Drop-Off Analysis:                                              │
│  ────────────────────────────────────────────────────────────   │
│  Biggest drop: Step 5→6 (Form submit)                           │
│  - 597 started form                                             │
│  - 436 submitted (73% completion)                               │
│  - Lost: 161 users (27%) ← FIX THIS                             │
│                                                                   │
│  Why users abandon at form:                                     │
│  - Form too long (8 fields) ← Reduce to 5                       │
│  - Email field has high reject rate ← Better copy               │
│  - Mobile completion rate 62% vs desktop 84% ← Focus mobile      │
│                                                                   │
│  Second biggest drop: Session→Browse (20%)                      │
│  - 5,234 sessions but only 4,187 browse guides                  │
│  - Cause: 10% bounce on home page, 10% search page load time    │
│  - Fix: Optimize hero section, improve page speed               │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### Revenue Dashboard (Finance View)

```
┌───────────────────────────────────────────────────────────────────┐
│        REVENUE & FINANCIAL DASHBOARD                              │
│        Today | Feb 19, 2026                                      │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Today's Performance:                                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Gross Revenue:     ฿847,250                                │ │
│  │ (Before commissions, taxes)                                │ │
│  │                                                            │ │
│  │ Transactions:      102 bookings                            │ │
│  │ Average Order:     ฿8,307 (includes ฿550 avg tax)        │ │
│  │ Revenue/Trans:     ฿8,307                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Month-to-Date (Feb 1-19):                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Total Revenue:    ฿16,842,500                              │ │
│  │ Total Bookings:   2,047                                    │ │
│  │ Avg per booking:  ฿8,230                                  │ │
│  │                                                            │ │
│  │ Projected Month Total: ฿29.4M (if pattern continues)      │ │
│  │ Last month (Jan):      ฿22.1M                              │ │
│  │ Growth:                33% month-over-month ↑             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Annual Run Rate (Based on Month-to-Date Avg):                   │
│  ฿29.4M/month × 12 = ฿352.8M/year                              │
│  (Goal: ฿360M → On track! ✓)                                    │
│                                                                   │
│  Revenue by Guide Type:                                          │
│  ┌──────────────┬──────────────┬──────────────────┐            │
│  │ Verified     │ ฿13.4M (79%) │ 1,612 bookings  │            │
│  │ New (<30d)   │ ฿2.1M (13%)  │ 267 bookings    │            │
│  │ Trending     │ ฿1.3M (8%)   │ 168 bookings    │            │
│  └──────────────┴──────────────┴──────────────────┘            │
│                                                                   │
│  Commission Insights:                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Commission Rate:     20%                                   ││
│  │ Guides Take Home:    80% (฿13.5M)                          ││
│  │ MaleBangkok Keep:    20% (฿3.4M)                           ││
│  │ Stripe Fee (2.9%):   (Deducted from MaleBangkok take)      ││
│  │ Net MaleBangkok:     ฿3.0M (after payment fees)            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### Growth & Trend Dashboard (CMO/Marketing View)

```
┌───────────────────────────────────────────────────────────────────┐
│       GROWTH & TRENDS DASHBOARD                                   │
│       Rolling 30 Days | Feb 19, 2026                             │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Traffic & Acquisition:                                          │
│  ├─ Daily Sessions:      5,234 (avg)  ↑ 18% vs Jan             │
│  ├─ Mobile / Desktop:    45% / 55%    ① Growing mobile segment │
│  ├─ New Users:          847/day       ↑ 22% vs Jan             │
│  ├─ Repeat Users:       4,387/day     ↑ 16% vs Jan             │
│  └─ Conversion Visitors: 58 → 102 per day                      │
│                                                                   │
│  Engagement Trends (7-Day Moving Avg):                           │
│  Card CTR:        25% → 27% → 28% ↑ (Redesign working!)        │
│  Form Complete:   70% → 72% → 73% ↑ (Field reduction helping)  │
│  Profile Time:    78s → 82s → 85s ↑ (More engagement)          │
│  Payment Success: 92% → 93% → 94% ↑ (Better form UX)           │
│                                                                   │
│  Repeat Booking Trend:                                           │
│  Jan (7-day cohort):  16% repeat in 30 days                    │
│  Feb (7-day cohort):  19% repeat in 30 days  ↑ 18% improvement │
│  Target:             35% by end of Q2                          │
│                                                                   │
│  A/B Tests Running:                                              │
│  ├─ Hero Copy Variants              Started: Feb 12, n=4,300   │
│  │  Control: "Premium Male Therapy" | Variant A: "Elite Match" │
│  │  Winner emerging: Variant A (CTR 28% vs 25%)               │
│  │                                                            │
│  ├─ Card Design (Enhanced vs Current)   Started: Feb 15        │
│  │  Early data: Enhanced CTR 30% vs Current 25% ✓             │
│  │  Significance: Will be clear by Feb 26                    │
│  │                                                            │
│  └─ Booking Form (5-field vs 8-field)    Starting: Feb 20     │
│     Hypothesis: 5 fields = 85% completion vs 7372% current  │
│                                                                   │
│  Geographic Performance:                                        │
│  Bangkok:        ฿12.1M (72%)  → 10K bookings  ↑ 14%           │
│  Phuket:         ฿2.9M (17%)   → 2.5K bookings ↑ 8%            │
│  Chiang Mai:     ฿1.8M (11%)   → 1.5K bookings ↑ 3%            │
│                                                                   │
│  Forecast (If trends continue):                                 │
│  March revenue:  ฿31.2M (↑ 6% vs Feb projection)              │
│  April revenue:  ฿35.8M (↑ 15% with optimization full impact) │
│  May revenue:    ฿38.2M (repeat bookings compound)             │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 5. AUTOMATED REPORT CADENCE

### Daily (9 AM via Email)

```
Recipients: CEO, CFO, Product Manager, Analytics Manager

Subject: MaleBangkok Daily Revenue Report — Feb 19, ฿847K

Content:
- Revenue (previous day, 7-day avg, 30-day total)
- Bookings (count, AOV, conversion)
- Top guides (by revenue, by CTR)
- Alert summary (> 1 alert = action required)
- Quick forecast (on track for monthly target?)
- Key metric changes (> 10% changes noted)
```

### Weekly (Monday 8 AM)

```
Recipients: Full leadership team

Report includes:
- Revenue breakdown (by guide, by geography, by type)
- Funnel analysis (where are we losing users?)
- A/B test results (weekly winners)
- repeat user cohort analysis
- Guide quality metrics (ratings, reviews, no-show rate)
- Technical health (uptime, error rates, page speed)
```

### Monthly (First Monday)

```
Recipients: Board, Investors, Full Team

Comprehensive report:
- Executive summary (in 1 slide)
- Revenue & KPI progress vs target
- Cohort analysis (new users → repeat rate → LTV)
- Guide performance (top/bottom performers)
- Marketing ROI (if paid advertising)
- Optimization results (A/B tests, design changes)
- Technical infrastructure (capacity planning, security)
- Next month priorities
```

### Quarterly (First Monday)

```
Recipients: Board, Stakeholders

Strategic review:
- 90-day performance vs targets
- Annual forecast
- Competitive analysis (if applicable)
- Product roadmap impact on KPIs
- Staffing/investment needs
- Risk assessment (what could go wrong?)
```

---

## 6. ACTION FRAMEWORK (When KPI Misses)

### If Conversion Drops Below 1.5%

```
1. Check System Health (5 min)
   - Is production database online?
   - Is payment processor (Stripe) up?
   - Are there server errors? (Check error logs)
   
2. Deep Dive Funnel (15 min)
   - Which step saw biggest drop?
     Step 1 (browse): → Traffic quality issue?
     Step 2 (profile): → Search relevance issue?
     Step 3 (book button): → Copy/design issue?
     Step 4 (form): → Field friction?
     Step 5 (payment): → Payment error?
   
3. Segment Analysis (10 min)
   - Is whole platform down or specific guides?
   - Mobile vs desktop issue?
   - New users vs repeat users?
   
4. Root Cause (5-15 min depending on findings)
   - Server error → Call DevOps engineer
   - Payment processor down → Contact Stripe support
   - Traffic quality → Check marketing campaigns (bad sources?)
   - Form friction → Check error logs for validation issues
   
5. Recovery Communication (5 min)
   - If system issue: Notification to team + customers
   - If product issue: Quick fix or rollback
   - If marketing issue: Pause bad campaigns
```

### If Form Completion Drops Below 75%

```
1. Last 100 abandonments
   - Are they all at same field?
   - Mobile vs desktop pattern?
   - Repeat users vs new users?
   
2. Error analysis
   - What validation errors appear before abandon?
   - Are error messages clear?
   - Too many errors = bad UX
   
3. Heatmap analysis (if using Hotjar/FullStory)
   - Which field do users rage-click?
   - How far do they scroll before leaving?
   - Form visibility on mobile?
   
4. Quick fixes
   - Error message clarity improvement
   - Make phone optional instead of required
   - Add trust message ("Your data is secure")
   - Autofill email from profile
   - Simplify special requests field
   
5. Test & measure
   - A/B test improved form vs current
   - Target: Get back to 80%+ within 1 week
```

---

## Summary: KPI Monitoring Framework

```
┌──────────────────────────────────────────────────────────┐
│         MALEBANGKOK KPI HIERARCHY                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ PRIMARY (Must Track Daily)                              │
│ ├─ Total Revenue                                        │
│ ├─ Booking Conversion Rate (overall)                    │
│ ├─ RPV (Revenue per Visitor)                            │
│ └─ Payment Success Rate                                 │
│                                                          │
│ SECONDARY (Diagnose Issues)                             │
│ ├─ Card CTR (discovery quality)                         │
│ ├─ Profile Engagement (content quality)                 │
│ ├─ Form Completion (booking friction)                   │
│ ├─ AOV (pricing optimization)                           │
│ └─ Repeat Booking (retention health)                    │
│                                                          │
│ TERTIARY (Continuous Improvement)                       │
│ ├─ Mobile vs desktop performance                        │
│ ├─ Geographic segments                                  │
│ ├─ Guide quality metrics                                │
│ └─ A/B test results                                     │
│                                                          │
│ ALERTS Auto-Triggered                                   │
│ 🔴 Revenue < 80% of normal → Immediate escalation      │
│ 🟡 Conversion < 1.5% → Investigate within 4 hours      │
│ 🟢 Form drop > 10% → Review within 24 hours            │
│                                                          │
│ OPTIMIZATION CADENCE                                    │
│ Daily:   Review primary KPIs                           │
│ Weekly:  Review secondary KPIs + A/B test results      │
│ Monthly: Strategic review + forecasting                │
│ Qty:     Major product/pricing decisions               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

