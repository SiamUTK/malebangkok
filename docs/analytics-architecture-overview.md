# Analytics Architecture Overview

## PART A — Complete Event Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      EVENT TRACKING ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│   USER INTERACTION   │
│                      │
│ • Click Guide Card   │
│ • View Profile       │
│ • Fill Booking Form  │
│ • Submit Payment     │
│ • Leave Review       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│   FRONTEND EVENT LAYER (React)               │
│  ┌────────────────────────────────────────┐  │
│  │ analytics/analytics.js                 │  │
│  │                                        │  │
│  │ • trackEvent(name, params)             │  │
│  │ • trackPageView(page, properties)      │  │
│  │ • trackRevenue(bookingData)            │  │
│  │ • trackAISignal(signal, params)        │  │
│  └────────────────────────────────────────┘  │
└──────────┬───────────────────────────────────┘
           │
           ├─────────────────────────────────┐
           │                                 │
           ▼                                 ▼
    ┌──────────────────┐         ┌──────────────────────┐
    │    GA4 Stream    │         │   Internal API       │
    │                  │         │   (Optional)         │
    │ • Event routing  │         │                      │
    │ • User ID        │         │ • Revenue events     │
    │ • Session ID     │         │ • AI learning data   │
    │ • Device info    │         │ • Fraud signals      │
    │ • Conversion tag │         │ • Churn predictions  │
    └──────┬───────────┘         └──────────┬───────────┘
           │                                 │
           ▼                                 ▼
    ┌──────────────────┐         ┌──────────────────────┐
    │  Google Analytics│         │   MaleBangkok API    │
    │                  │         │   /api/analytics     │
    │ • Real-time      │         │                      │
    │ • Dashboards     │         │ • Event logging      │
    │ • Funnel reports │         │ • Fraud detection    │
    │ • Audiences      │         │ • AI training data   │
    └──────┬───────────┘         └──────────┬───────────┘
           │                                 │
           ▼                                 ▼
    ┌──────────────────┐         ┌──────────────────────┐
    │ BigQuery Export  │         │   MySQL Events Log   │
    │                  │         │                      │
    │ • Long-term      │         │ • Persistent storage │
    │ • ML training    │         │ • 30-day retention   │
    │ • Cohorts        │         │ • GDPR-compliant     │
    └──────────────────┘         └──────────────────────┘


```

## Event Classification & Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                    FOUR EVENT CATEGORIES                               │
└────────────────────────────────────────────────────────────────────────┘

1. UI INTERACTION EVENTS
   Purpose: Understand user behavior and friction points
   Examples: click_button, scroll_distance, form_field_focused
   Storage: GA4 only (no internal backend logging)
   Retention: 14 days (GA4 free tier)
   Privacy: Minimal – only high-level interactions
   
   Flow: React Component → analytics.trackEvent() → GA4
                              ↓
                        [User behavior dashboard]
                        [Heatmap data]
                        [Funnel analysis]

2. FUNNEL EVENTS
   Purpose: Track user journey through core product flow
   Examples: view_guide_list → view_guide_profile → click_book_button → 
             start_booking → submit_booking → booking_success
   Storage: GA4 + Internal API
   Retention: 365 days
   Privacy: Core transaction data only
   
   Flow: React Component → analytics.trackEvent() → GA4
                             ↓
                        Internal API (/api/analytics/funnel)
                             ↓
                        MySQL events_log table
                             ↓
                        [Funnel reports]
                        [Conversion rate tracking]
                        [Drop-off analysis]

3. REVENUE EVENTS
   Purpose: Tie revenue to user actions, track LTV
   Examples: booking_success, refund_issued
   Storage: GA4 + Internal API (double-write critical)
   Retention: Permanent
   Privacy: User ID (hashed), booking ID, price only
   
   Flow: React Component → analytics.trackRevenue() → GA4 ecommerce
                             ↓
                        Internal API (/api/analytics/revenue)
                             ↓
                        MySQL bookings table + revenue_events table
                             ↓
                        [Revenue dashboard]
                        [LTV calculations]
                        [Guide performance rankings]
                        [Reconciliation reports]

4. AI LEARNING SIGNALS
   Purpose: Improve guide ranking algorithm
   Examples: guide_clicked, profile_time_spent, price_sensitivity
   Storage: Internal API only (GA4 not suitable for ML)
   Retention: 365 days (training data)
   Privacy: Anonymized – no user name/email
   
   Flow: React Component → analytics.trackAISignal() 
                             ↓
                        Internal API (/api/analytics/ai-signals)
                             ↓
                        MySQL ai_training_signals table
                             ↓
                        [Matching algorithm training]
                        [Ranking model optimization]
                        [Recommendation engine]


┌────────────────────────────────────────────────────────────────────────┐
│                   EVENT NAMING CONVENTION                              │
└────────────────────────────────────────────────────────────────────────┘

Format: [category]_[action]_[object]

Categories:
  view_*      — Page or section viewed (passive)
  click_*     — Button or link clicked (user intent)
  submit_*    — Form submitted (state change)
  start_*     — Flow initiated (funnel entry)
  complete_*  — Step finished (funnel progression)
  error_*     — Error occurred (negative signal)
  abandon_*   — User left without completing (negative signal)

Examples:
  ✓ view_guide_list        (user viewed list page)
  ✓ click_guide_card       (user clicked specific card)
  ✓ click_book_button      (user initiated booking)
  ✓ start_booking          (funnel entry point)
  ✓ submit_booking_form    (form submitted)
  ✓ booking_success        (payment authorized)
  ✓ abandon_booking_form   (user left form)


┌────────────────────────────────────────────────────────────────────────┐
│                  SECURE TRACKING PRINCIPLES                            │
└────────────────────────────────────────────────────────────────────────┘

✓ Minimal: Only track essential signals
✓ Consensual: User aware of analytics via privacy page
✓ Compliant: No PII in GA4, anonymized AI signals
✓ Reversible: Data retention policies enforced (no forever)
✓ Transparent: Privacy layer documented and auditable
✓ Safe: gtag errors don't break platform

```

## Data Flow Examples

### Example 1: Guide Card Click

```
User clicks "View Profile" on guide card
     ↓
GuideCard.jsx calls:
  analytics.trackEvent('click_guide_card', {
    guide_id: 'G123',
    guide_name: 'Ares',
    guide_rating: 4.8,
    guide_verified: true,
    card_position: 0,
    timestamp: 1708346400000
  })
     ↓
analytics.js validates and sends to GA4:
  gtag('event', 'click_guide_card', {
    guide_id: 'G123',
    guide_name: 'Ares',
    guide_rating: '4.8',
    is_verified: true,
    position: '0'
    session_id: 'SESSION123'
  })
     ↓
GA4 stores event:
  [Real-time monitoring active]
  [Contributes to: Click-through rate KPI]
  [Enables: Audience segmentation]
     ↓
Dashboard shows:
  "5,234 click_guide_card events today"
  "CTR: 28.5%"
  "Top clicked guide: Ares (847 clicks)"
```

### Example 2: Booking Success (Revenue)

```
User completes payment
     ↓
Payment.jsx calls:
  analytics.trackRevenue({
    booking_id: 'BK-789',
    guide_id: 'G123',
    user_id_hashed: 'HASH_USER456',
    price: 8025,
    currency: 'THB',
    session_id: 'SESSION123'
  })
     ↓
analytics.js sends TWO events:
  
  (1) GA4 ecommerce event:
      gtag('event', 'purchase', {
        transaction_id: 'BK-789',
        value: 8025,
        currency: 'THB',
        items: [{
          item_id: 'G123',
          item_name: 'Ares',
          price: 8025
        }]
      })
  
  (2) Internal API async:
      POST /api/analytics/revenue {
        booking_id: 'BK-789',
        guide_id: 'G123',
        price: 8025,
        currency: 'THB',
        user_id_hashed: 'HASH_USER456',
        timestamp: 1708346400000
      }
     ↓
GA4 + Internal API both log:
  [Revenue dashboard: +฿8,025]
  [Guide performance: Ares +1 booking]
  [User journey: Booked guide from search]
     ↓
Backend services use data:
  [Revenue reconciliation (Stripe match)]
  [Guide ranking recalculation]
  [Funnel attribution (which guide card led to booking?)]
```

### Example 3: Booking Abandoned (AI Signal)

```
User fills booking form, starts entering details
     ↓
BookingFlow.jsx tracks each step:
  analytics.trackEvent('start_booking', {...})
  analytics.trackEvent('booking_form_fill_step_1', {...})
  analytics.trackEvent('booking_form_fill_step_2', {...})
  analytics.trackAISignal('engagement_time_profile', {
    guide_id: 'G123',
    time_spent_seconds: 184,
    ...
  })
     ↓
User closes tab without completing:
     ↓
analytics.js (via unmount) logs:
  analytics.trackEvent('abandon_booking_form', {
    guide_id: 'G123',
    last_step_completed: 'step_2',
    time_spent: 184,
    form_completion: 0.67
  })
     ↓
GA4: Records funnel drop-off
     ↓
Internal API: Stores signal for AI matching
  analytics.trackAISignal('booking_abandon', {
    guide_id: 'G123',
    user_id_hashed: 'HASH_USER456',
    profile_engagement_seconds: 184,
    form_reach_percent: 67
  })
     ↓
Backend ML uses signal:
  [Guide ranking: Check if guide quality issue]
  [Pricing sensitivity: User browsed but didn't convert]
  [Matching: Recommend different guides to user]
```

