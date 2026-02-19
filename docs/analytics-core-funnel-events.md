# PART B — Core Funnel Events Specification

## Production-Ready GA4 Event Definitions

| Event Name | Trigger Point | Parameters | GA4 Type | Why It Matters |
|------------|---------------|-----------|----------|----------------|
| **view_guide_list** | User lands on Home page or browses guides section | `session_id`, `filter_type` (e.g., "verified_only", "high_rating"), `guide_count`, `page_load_time_ms` | Pageview → Event | **Funnel entry:** Establishes visitor baseline. Identifies traffic sources. Measures page performance impact on bounce rate. Target: 100% of sessions. |
| **click_guide_card** | User clicks on any guide card in list view | `guide_id`, `guide_name`, `guide_rating`, `guide_verified`, `guide_tenure_months`, `card_position` (0-indexed), `list_context` (e.g., "search_results", "recommended", "trending") | Engagement | **Discovery CTR:** Primary conversion metric. 25-35% target. Identifies which guides attract clicks. Enables A/B testing of card design. Feeds guide popularity ranking. |
| **view_guide_profile** | User views the full guide profile page | `guide_id`, `guide_name`, `guide_rating`, `price`, `session_duration_ms` (time from click_guide_card to view), `referrer` (which card list), `device` (mobile/desktop) | Pageview → Event | **Profile engagement:** Secondary funnel metric. 60% expect to book after viewing. Measures guide content quality. Identifies mobile friction (target: 40% mobile CTR). |
| **click_book_button** | User clicks "Reserve Private Session" or primary CTA on profile | `guide_id`, `guide_name`, `price`, `cta_position` (e.g., "hero_sticky", "mid_page", "bottom_scroll"), `time_on_profile_ms`, `scroll_depth_percent` | Engagement | **Booking intent signal:** Strong predictor of conversion. 40-60% expect form start. Measures CTA placement effectiveness. Identifies profile content gaps (low CTR = weak value prop). |
| **start_booking** | User successfully loads booking form (form element mounted) | `guide_id`, `guide_name`, `price`, `booking_form_version` (e.g., "v1_8fields", "v2_5fields"), `device`, `session_id` | Engagement | **Funnel entry:** Booking flow baseline. 85% target form completion from here. Identifies form load issues or browser errors. |
| **submit_booking_form** | User submits booking form with all required fields | `guide_id`, `booking_id` (temporary), `price`, `total_price_with_tax`, `form_completion_percent`, `special_requests_included` (boolean), `errors_corrected` (count), `time_to_submit_ms` | Engagement | **Form conversion:** 85%+ of form starts must reach this. Identifies field friction. Measures special requests adoption (10-15% target). |
| **booking_confirmation** | Server confirms booking and returns booking_id | `booking_id`, `guide_id`, `price`, `user_id_hashed`, `payment_status` (pending/authorized), `session_id` | Engagement | **Validation point:** Ensures order confirmation received. Triggers email send. Enables post-booking nurture sequencing. |
| **booking_success** | Payment authorized by Stripe (webhook received) | `booking_id`, `guide_id`, `guide_name`, `user_id_hashed`, `price`, `currency` (THB), `session_date`, `session_time`, `user_type` (new/repeat), `discount_code` (if used), `revenue` (final amount) | Purchase (Ecommerce) | **CRITICAL REVENUE EVENT:** Primary KPI. Single source of truth for transactions. Must match Stripe webhook. Feeds LTV and guide performance metrics. |
| **booking_failed** | Payment declined or booking error occurs | `booking_id`, `guide_id`, `price`, `error_code` (e.g., "card_declined", "timeout", "form_validation_error"), `error_message`, `failure_point` (form_submit/payment_processing/confirmation) | Event | **Error tracking:** Critical for identifying conversion blockers. 2% error rate target. Enables real-time alerts. |
| **login_success** | User successfully authenticates | `user_id_hashed`, `login_method` (email/google/facebook), `time_since_registration_days` (if new user), `device` | Engagement | **Funnel restart:** Marks repeat user. Enables user-level analytics. Identifies authentication errors. Prerequisite for booking. |
| **register_success** | User completes account registration | `user_id_hashed`, `registration_source` (homepage/booking_form/invite), `registration_time_ms`, `email_verified` (boolean) | Engagement | **Acquisition:** Identifies user origin and registration efficiency. Feeds email nurture sequences. |
| **view_checkout** | User navigates to payment/checkout page | `booking_id`, `guide_id`, `price`, `total_with_tax`, `promo_code_applied` (boolean), `device`, `payment_method_options` (card/bank_transfer) | Pageview | **Payment funnel entry:** 98%+ of booking_success expect to reach here. Identifies payment friction. Measures discount adoption. |
| **add_guide_to_wishlist** | User saves guide to wishlist (heart icon clicked) | `guide_id`, `guide_name`, `user_id_hashed`, `wishlist_count_after` | Engagement | **Retention signal:** Repeat intention. Enables retargeting. Feeds recommendation algorithm. 5-10% expected on high-rated guides. |
| **submit_review** | User submits booking review/rating | `review_id`, `booking_id`, `guide_id`, `rating` (1-5), `review_length_chars`, `time_since_session_days` | Engagement | **Social proof creation:** Powers guide rankings. Identifies guide quality issues (low avg rating). 20-30% expected from completed bookings. |
| **apply_matching** | User uses AI matching tool to find guides | `matching_filters` (location/type/rating), `matches_count`, `match_clicked_position` (0-indexed), `time_in_matching_ms` | Engagement | **AI signal:** Validates matching algorithm usefulness. 2-5% of users expected. Feeds next-generation guide ranking. |
| **view_user_dashboard** | User views their booking history/dashboard | `user_id_hashed`, `booking_count`, `repeat_rate_percent` | Pageview | **Retention indicator:** Active user engagement. Identifies churn risk (declining re-booking). |
| **cancel_booking** | User cancels confirmed booking | `booking_id`, `guide_id`, `reason_code` (user_requested/guide_unavailable/payment_failed), `refund_status`, `booking_age_hours` | Engagement | **Churn signal:** Indicates product issue or buyer's remorse. Target < 2% cancellation rate. Feeds fraud/abuse detection. |

---

## Event Firing Sequence Example: Complete Happy Path

```javascript
// User journey: Search → Profile → Booking → Payment → Confirmation

1. [10:00 AM] view_guide_list
   guide_count: 24, filter_type: "verified_only", page_load_time_ms: 850

2. [10:02 AM] click_guide_card  ← CTR measurement starts here
   guide_id: "G123", guide_name: "Ares", guide_rating: 4.8, 
   card_position: 3, list_context: "search_results"

3. [10:02 AM] view_guide_profile  ← Journey continues
   guide_id: "G123", guide_rating: 4.8, price: 7500,
   session_duration_ms: 1200, scroll_depth_percent: 85

4. [10:05 AM] click_book_button  ← Booking intent confirmed
   guide_id: "G123", price: 7500, cta_position: "sticky_bottom",
   time_on_profile_ms: 180000

5. [10:05 AM] start_booking  ← Form entry
   guide_id: "G123", booking_form_version: "v2_5fields"

6. [10:08 AM] submit_booking_form  ← Form conversion
   guide_id: "G123", price: 7500, total_price_with_tax: 8025,
   special_requests_included: true, time_to_submit_ms: 180000

7. [10:08 AM] booking_confirmation  ← Server validates
   booking_id: "BK-001", payment_status: "pending"

8. [10:09 AM] view_checkout  ← Payment page
   booking_id: "BK-001", guide_id: "G123", price: 8025

9. [10:10 AM] booking_success [REVENUE EVENT]  ← Payment authorized
   booking_id: "BK-001", guide_id: "G123", price: 8025,
   revenue: 8025, user_type: "new"

10. [10:10 AM] Confirmation email sent (backend automation)

Metrics calculated from this sequence:
✓ Conversion: 1 booking from 1 viewer = 100% (sample size 1)
✓ CTR: card_click / list_viewed = 1 of 24 = 4.2%
✓ Profile-to-booking: 1 profile → 1 booking = 100%
✓ Form completion: 1 form submitted = 100%
✓ Revenue: ฿8,025 attributed to G123
✓ Repeat potential: Track if user books again within 30 days
```

---

## Event Parameter Schema Reference

### Common Parameters (All Events)
```javascript
{
  session_id: string,           // GA4 session ID (automatic)
  user_id_hashed: string,       // SHA256(user_id) - only for authenticated users
  timestamp: number,            // Unix milliseconds
  device: string,               // "mobile" | "tablet" | "desktop"
  referrer: string,             // Previous page source
  campaign: string              // UTM campaign (if applicable)
}
```

### Guide-Related Parameters
```javascript
{
  guide_id: string,             // Unique guide identifier (G123)
  guide_name: string,           // Display name (optional - for labeling)
  guide_rating: float,          // 1.0-5.0
  guide_verified: boolean,      // Verification status
  guide_tenure_months: number,  // Months on platform
  price: number                 // Base price in minor units (7500 THB = 75.00 units)
}
```

### Booking-Related Parameters
```javascript
{
  booking_id: string,           // Booking reference (BK-001)
  total_price_with_tax: number, // Final amount charged
  currency: string,             // "THB"
  session_date: string,         // YYYY-MM-DD format
  session_time: string,         // HH:MM format
  user_type: string,            // "new" | "repeat"
  special_requests_included: boolean
}
```

### Form-Related Parameters
```javascript
{
  form_completion_percent: float,  // 0-100
  time_to_submit_ms: number,       // Milliseconds spent filling
  errors_corrected: number,        // How many validation errors fixed
  booking_form_version: string     // "v1_8fields" | "v2_5fields"
}
```

---

## Critical Implementation Notes

### ✓ DO:
- Fire events immediately when action occurs (don't wait for page load)
- Hash user_id before sending to GA4 (SHA256)
- Include session_id to enable user-level analysis
- Test all events in development before production
- Monitor event latency (should be < 100ms)

### ✗ DON'T:
- Send PII (personal names, emails, phone numbers)
- Include raw user IDs in GA4 (use hashed only)
- Fire duplicate events (deduplication in code)
- Send null/undefined parameters (omit instead)
- Track in production without gtag consent check

