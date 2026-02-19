# PART E — AI Learning Signals Specification

## Guide Ranking & Matching Algorithm Improvement

### Signal Definitions

AI learning signals are behavioral markers that help improve the guide matching algorithm and recommendation engine. Unlike funnel events (which track conversions), these signals capture user intent patterns that inform guide quality, relevance, and ranking.

---

## Detailed Signal Specifications

| Signal Type | Meaning | Data Payload | ML Usage | Expected Frequency |
|-------------|---------|--------------|----------|------------------|
| **guide_clicked** | User clicked on guide card from list | `guide_id`, `guide_rating`, `guide_verified`, `card_position`, `list_context` (recommended/search/trending), `user_engagement_score` | Signals which guides attract user interest. Improves relevance ranking. Identifies rising guides. Detects low-quality guides (never clicked). | 15-20% of guide cards shown |
| **profile_time_spent** | User spent meaningful time reading guide profile | `guide_id`, `time_seconds`, `scroll_depth_percent`, `sections_viewed` (bio/reviews/gallery/rates), `engagement_score` | Indicates content quality and user interest. Long time = valuable guide. Short time = poor content or mismatch. Helps refine "quality" signal. | 60% of profile views |
| **booking_abandoned_after_profile** | User viewed profile but didn't click "Book" | `guide_id`, `profile_time_seconds`, `reason_inferred` (too_expensive/poor_reviews/availability/user_left), `user_search_filters` | Identifies mismatch between user expectations and guide details. Guides with high abandon rate may have presentation issues. | 40% of profile views |
| **price_filter_used** | User filtered guides by price range | `price_min`, `price_max`, `results_count`, `filter_order` (before/after_rating_filter) | Reveals user's price sensitivity and budget. Helps optimize pricing recommendations and guide positioning. | 30% of users |
| **matching_algorithm_used** | User actively used AI matching tool | `filter_criteria` (location/type/rating/availability), `matches_returned`, `match_clicked_position`, `match_booking_conversion` (did they book?) | Validates matching algorithm performance. High matching-to-booking rate = effective algorithm. Low rate = refinement needed. | 2-5% of users |
| **rating_filter_applied** | User filtered by minimum rating threshold | `rating_min` (3.5/4.0/4.5/5.0), `results_before_filter`, `results_after_filter` | Shows user's quality expectations. Helps identify rating inflation / guides below user standards. | 25% of users |
| **review_section_engagement** | User read reviews and ratings extensively | `guide_id`, `review_count_viewed`, `time_in_reviews_seconds`, `helpful_clicks`, `rating_distribution_viewed` | Reviews heavily influence booking decisions. Guides with more helpful reviews = higher conversion. | 70% of bookings from profile view |
| **availability_check** | User viewed guide's availability/pricing calendar | `guide_id`, `session_dates_checked`, `booked_session_count`, `price_variation_detected` | Shows user is seriously considering booking. Availability mismatches cause abandonment. | 50% of profile views |
| **guide_saved_to_wishlist** | User saved guide for later (heart button) | `guide_id`, `guide_name`, `guide_rating`, `wishlist_position` (new/replaced), `days_until_rebook` | Strong retention signal. Users save guides they intend to rebook. Helps identify loyal customer segments. | 5-8% of profile views |
| **booking_success_with_guide** | Successful booking confirmed with guide | `guide_id`, `user_previous_bookings_count`, `user_total_spend`, `guide_total_bookings` | Positive outcome signal. Guides who complete bookings should rank higher. Repeat bookings with same guide = trust signal. | 0.5-1.5% of impressions |
| **booking_cancellation_after_confirmed** | User canceled after booking was confirmed | `guide_id`, `booking_age_hours`, `cancellation_reason`, `user_cancellation_history` | Negative signal. High cancellation rate indicates guide quality issues. May flag fraudulent guides. | 0.1-0.5% of bookings |
| **guide_quality_signal** | Review submitted post-session | `guide_id`, `session_id`, `rating_given` (1-5), `review_text_sentiment` (positive/neutral/negative), `reviewer_verified_guest` | Direct quality feedback. 5-star reviews = promote guide. 1-2 star = investigate issues. Sentiment analysis catches hidden problems. | 20-30% of completed sessions |
| **session_no_show_rate** | Guide or user didn't show up for session | `guide_id`, `no_show_party` (guide/user), `session_time_slot`, `booking_confirmation_status` | Quality red flag. Repeated no-shows damage guide ranking. Users with pattern of no-shows get lower priority matching. | 1-3% of booked sessions |
| **user_search_pattern** | User repeatedly searches for similar guide types | `search_keywords`, `applied_filters`, `search_frequency`, `search_to_booking_conversion` | Identifies unmet demand. If users search for feature X but no guides have it = gap. Helps guides optimize offerings. | 30-40% of users |
| **guide_comparison_engagement** | User views multiple guides side-by-side for comparison | `guide_ids_compared` (array), `comparison_criteria` (rating/price/reviews), `winner_guide_id`, `booking_outcome` | Shows competitive positioning. Guides who "win" comparisons should rank higher. | 10-15% of users |
| **message_response_time** | How quickly guide responds to booking inquiry | `guide_id`, `response_time_minutes`, `message_helpfulness_score`, `user_satisfaction_rating` | Messaging quality impacts user trust. Fast, helpful responses → higher conversion. | 5-10% of users |
| **repeat_booking_signal** | User books same guide again | `guide_id`, `repeat_booking_count`, `days_between_bookings`, `user_lifetime_value_with_guide` | Strongest trust signal. Repeat bookings indicate satisfied users. Helps improve guide loyalty metrics. | 10-15% of returning users |

---

## ML Training Data Example

```javascript
// Data structure sent to /api/analytics/ai-signals
// Used to train guide ranking models

{
  signal_type: 'profile_time_spent',
  signal_data: {
    guide_id: 'G-123',
    user_id_hashed: 'SHA256_HASH',
    time_seconds: 184,          // User spent 3+ minutes
    scroll_depth_percent: 85,   // Scrolled almost entire page
    sections_viewed: [
      'introduction',
      'experience_list',
      'reviews',
      'photo_gallery'
    ],
    engagement_score: 0.82,      // Composite engagement metric (0-1)
    device: 'mobile',
    timestamp: 1708346400000
  },
  created_at: '2026-02-19T10:00:00Z'
}

// ML model trains on thousands of these:
// Input: guide_id, user_engagement_score, sections_viewed, device
// Output: predict_booking_likelihood (0-100%)
// 
// Result: Higher engagement scores = guides ranked higher in recommendations
```

---

## Signal Implementation (Code Examples)

### 1. Track Guide Click (Discovery Ranking)

```javascript
// In GuideCard.jsx
import { trackAISignal } from '@/utils/analytics';

const handleCardClick = (guide) => {
  // Track for AI ranking improvement
  trackAISignal('guide_clicked', {
    guide_id: guide.id,
    guide_name: guide.name,
    guide_rating: guide.rating,
    guide_verified: guide.verified,
    card_position: cardIndex,
    list_context: 'search_results'  // or 'recommended', 'trending'
  });
  
  // Navigate to profile
  navigate(`/guides/${guide.id}`);
};
```

### 2. Track Profile Engagement Time

```javascript
// In GuideProfile.jsx
import { trackAISignal, trackEvent } from '@/utils/analytics';
import { useEffect, useRef } from 'react';

const GuideProfile = () => {
  const profileEntryTimeRef = useRef(Date.now());
  const isUnmountingRef = useRef(false);
  
  useEffect(() => {
    return () => {
      // When user leaves profile
      isUnmountingRef.current = true;
      const timeSpent = Math.round((Date.now() - profileEntryTimeRef.current) / 1000);
      
      // Only track if spent meaningful time (> 5 seconds)
      if (timeSpent > 5) {
        trackAISignal('profile_time_spent', {
          guide_id: guide.id,
          time_seconds: timeSpent,
          scroll_depth_percent: calculateScrollDepth(),
          sections_viewed: trackVisitedSections(),
          engagement_score: calculateEngagementScore(timeSpent)
        });
      }
    };
  }, [guide.id]);
  
  const calculateEngagementScore = (timeSeconds) => {
    // Simple scoring: 0-1, based on time spent
    // 30+ seconds = high engagement (0.8+)
    // 10-30 seconds = medium (0.4-0.8)
    // < 10 seconds = low (< 0.4)
    if (timeSeconds >= 30) return Math.min(1.0, timeSeconds / 60);
    if (timeSeconds >= 10) return 0.5 + (timeSeconds - 10) / 40;
    return timeSeconds / 25;
  };
  
  return (
    <div className="guide-profile">
      {/* Profile content */}
    </div>
  );
};
```

### 3. Track Booking Abandonment

```javascript
// In BookingFlow.jsx
import { trackAISignal, trackFormAbandon } from '@/utils/analytics';

const BookingFlow = ({ guide }) => {
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // User is leaving without completing booking
      trackAISignal('booking_abandoned_after_profile', {
        guide_id: guide.id,
        profile_time_seconds: getTimeOnProfile(),
        reason_inferred: inferAbandonmentReason(),
        user_search_filters: savedSearchFilters
      });
      
      // Also track form fill level
      trackFormAbandon('booking_form', {
        guide_id: guide.id,
        lastStepCompleted: currentStep,
        fieldsCompleted: completedFields.length,
        timeSpent: Math.round((Date.now() - formStartTime) / 1000)
      });
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [guide.id]);
};
```

### 4. Track Price & Rating Filter Usage

```javascript
// In GuideList.jsx
import { trackAISignal } from '@/utils/analytics';

const applyPriceFilter = (minPrice, maxPrice) => {
  trackAISignal('price_filter_used', {
    price_min: minPrice,
    price_max: maxPrice,
    results_count: filteredGuides.length,
    filter_order: 'after_rating_filter'  // Track filter sequence
  });
};

const applyRatingFilter = (minRating) => {
  trackAISignal('rating_filter_applied', {
    rating_min: minRating,
    results_before_filter: allGuides.length,
    results_after_filter: filteredGuides.length
  });
};
```

### 5. Track Review Engagement

```javascript
// In GuideProfile.jsx - Reviews Section
import { trackAISignal } from '@/utils/analytics';

const ReviewsSection = ({ guide, reviews }) => {
  const reviewsContainerRef = useRef(null);
  const reviewsEngagementStartRef = useRef(Date.now());
  
  const handleReviewClick = (reviewId, helpful) => {
    trackAISignal('review_section_engagement', {
      guide_id: guide.id,
      review_count_viewed: viewedReviewCount,
      time_in_reviews_seconds: getTimeInReviewsSection(),
      helpful_clicks: helpful ? (helpfulCount + 1) : helpfulCount,
      rating_distribution_viewed: true
    });
  };
  
  return (
    <div ref={reviewsContainerRef}>
      {/* Reviews list */}
      {reviews.map(review => (
        <ReviewCard
          key={review.id}
          review={review}
          onHelpfulClick={() => handleReviewClick(review.id, true)}
        />
      ))}
    </div>
  );
};
```

### 6. Track Wishlist (Future Booking Intent)

```javascript
// In GuideProfile.jsx
import { trackAISignal } from '@/utils/analytics';

const handleSaveGuide = (guide) => {
  const isAdding = !isSaved;
  
  if (isAdding) {
    trackAISignal('guide_saved_to_wishlist', {
      guide_id: guide.id,
      guide_name: guide.name,
      guide_rating: guide.rating,
      wishlist_position: userWishlist.length + 1,
      days_until_rebook: null  // Will update when they do rebook
    });
  }
  
  setIsSaved(!isSaved);
};
```

### 7. Track Matching Algorithm Usage

```javascript
// In Home.jsx - Matching Tool
import { trackAISignal, trackEvent } from '@/utils/analytics';

const MatchingTool = () => {
  const handleFindMatches = (filters) => {
    trackEvent('click_matching_tool', { filter_count: Object.keys(filters).length });
    
    const matches = getMatchingGuides(filters);
    
    trackAISignal('matching_algorithm_used', {
      filter_criteria: Object.keys(filters),
      matches_returned: matches.length,
      match_clicked_position: null  // Update when user clicks match
    });
  };
  
  const handleMatchClick = (matchIndex) => {
    trackAISignal('matching_algorithm_used', {
      match_clicked_position: matchIndex
      // The booking conversion will be tracked separately
    });
  };
};
```

---

## ML Model Training & Improvement Cycle

```
Month 1: Collect Baseline Signals
├─ 100K guide_clicked events
├─ 50K profile_time_spent events
├─ 10K booking_success events
└─ Build initial training dataset

Month 2: Train Ranking Models
├─ Feature engineering (engagement_score, repeat_booking_rate)
├─ Model training (Random Forest: guide quality prediction)
├─ Cross-validation (80/20 training/test split)
└─ Production deployment

Month 3: Validate & Iterate
├─ A/B test new ranking algorithm vs old
├─ Monitor booking_success rate (should ↑ with better ranking)
├─ Collect feedback events
└─ Retrain monthly with new signals

Continuous:
├─ Monitor signal quality (outliers, anomalies)
├─ Update ranking weekly with new bookings
├─ Track guide performance changes
└─ Detect and remove fraudulent signals
```

---

## Dashboard: AI Signal Monitoring

```
┌─────────────────────────────────────────────────────────────┐
│        AI Learning Signal Dashboard (Daily)                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Signals Collected (Yesterday):                             │
│   guide_clicked:                  5,234 events             │
│   profile_time_spent:             2,847 events             │
│   booking_abandoned:              423 events               │
│   price_filter_used:              912 events               │
│   review_engagement:              1,847 events             │
│   booking_success:                78 events                │
│                                                             │
│ Top Signals (by volume this week):                         │
│   1. guide_clicked (34K)        ↑ 12% week-over-week      │
│   2. profile_time_spent (18K)   ↑ 5%                      │
│   3. review_engagement (11K)    ↓ 8%                      │
│   4. price_filter_used (6K)     ↔ flat                    │
│                                                             │
│ Model Performance:                                         │
│   Guides ranked by algorithm:    324 guides               │
│   Ranking accuracy (vs booking): 0.78 (good)              │
│   Model last retrained:          2 days ago               │
│   Next scheduled retrain:        in 5 days                │
│                                                             │
│ Anomaly Detected:                                          │
│   ⚠ Guide G-567 has 0 clicks for 3 days (was 50/day)     │
│   Action: Review photos, description, or reviews          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Metrics for AI Improvement

| Metric | Target | Current | Status | Action |
|--------|--------|---------|--------|--------|
| Click-to-profile conversion (CTR) | 30%+ | 25% | ⚠ Below target | Test new card design vs AI ranking? |
| Profile-to-booking conversion | 40%+ | 38% | ⚠ Slightly low | Check guide quality signals |
| Average time on profile | 120+ sec | 84 sec | 🔴 Low | May indicate unclear guide info |
| Review engagement rate | 70%+ | 65% | ⚠ Below target | Consider review redesign |
| Repeat booking rate (30-day) | 35%+ | 18% | 🔴 Critical low | Need better guide matching |
| Matching tool CTR | 5%+ | 2% | 🔴 Low | Improve matching algorithm accuracy |

---

## Privacy & Compliance Notes

All AI signals are:
- ✓ Anonymized (user_id hashed to SHA256)
- ✓ Behavioral only (no personal information)
- ✓ Necessary for product improvement (not tracking for creepy reasons)
- ✓ Readable in privacy policy ("We use behavioral data to improve recommendations")
- ✓ Deletable on user request (delete from ai_training_signals table)
- ✓ Not shared externally (kept on MaleBangkok servers)

