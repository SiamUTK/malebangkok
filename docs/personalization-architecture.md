# PART A — AI Personalization Architecture (Learning Loop)

## Complete Event-to-Ranking Data Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                    USER ACTION TRIGGERS EVENT                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ User clicks guide card         →  event_type: 'guide_clicked'     │
│ OR                                                                 │
│ User views profile             →  event_type: 'guide_viewed'      │
│ OR                                                                 │
│ User completes booking         →  event_type: 'booking_completed' │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────┐
│            EVENT CAPTURED & STORED (Async, Non-blocking)           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ behaviorTrackingService.trackUserEvent({                         │
│   user_id: 123,                                                  │
│   event_type: 'guide_clicked',                                  │
│   guide_id: 'G-456',                                            │
│   metadata: {                                                    │
│     guide_price: 7500,                                          │
│     guide_age: 28,                                              │
│     guide_verified: true,                                       │
│     guide_city: 'Bangkok',                                      │
│     position: 3                                                 │
│   }                                                              │
│ })                                                               │
│                                                                    │
│ → Stored in: user_behavior_events table                          │
│ → No user-blocking (fire and forget)                            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────┐
│         BEHAVIOR AGGREGATED INTO PREFERENCE PROFILE                │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ preferenceEngine.inferUserPreferences(user_id)                   │
│                                                                    │
│ Analyzes all user_behavior_events for user_id:                  │
│                                                                    │
│ ✓ Guide clicked analysis:                                        │
│   - Extract prices from 10 most recent clicks                  │
│   - Calculate preferred_price_min, preferred_price_max         │
│   - Weight recent clicks higher (decay old)                    │
│                                                                    │
│ ✓ Age preference (if age visible):                             │
│   - Extract ages from clicked guides                           │
│   - Calculate median/IQR (preferred_age_min/max)               │
│                                                                    │
│ ✓ Verified preference:                                          │
│   - % of clicks on verified guides                              │
│   - If > 70% prefer verified = true                             │
│                                                                    │
│ ✓ City preference:                                              │
│   - Which city appears most in clicks                           │
│   - Set as preferred_city                                       │
│                                                                    │
│ → Stored in: user_preference_profiles table                      │
│ → Updated: Only on explicit trigger or daily batch              │
│                                                                    │
│ Output Example:                                                   │
│ {                                                                 │
│   user_id: 123,                                                  │
│   preferred_price_min: 5500,                                     │
│   preferred_price_max: 9000,                                     │
│   preferred_age_min: 26,                                         │
│   preferred_age_max: 32,                                         │
│   prefers_verified: 1,                                           │
│   preferred_city: 'Bangkok',                                     │
│   confidence_score: 0.78  ← Based on # signals                   │
│ }                                                                 │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────┐
│       GUIDE STATS TRACKED (Popularity & Performance)              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ Each guide accumulates:                                          │
│                                                                    │
│ ✓ total_views      ← Count of guide_viewed events               │
│ ✓ total_clicks     ← Count of guide_clicked events              │
│ ✓ total_bookings   ← Count of booking_completed events          │
│ ✓ conversion_rate  ← (total_clicks ÷ total_views) × 100        │
│                                                                    │
│ These signal:                                                     │
│ - Popular guides (high views) should rank higher                 │
│ - Converting guides (high click rate) trusted                  │
│ - Booked guides (completions) are high quality                  │
│                                                                    │
│ → Stored in: guide_performance_stats table                       │
│ → Updated: Daily batch job (non-blocking)                       │
│                                                                    │
│ Example:                                                          │
│ {                                                                 │
│   guide_id: 'G-456',                                             │
│   total_views: 1247,                                             │
│   total_clicks: 342,                                             │
│   total_bookings: 78,                                            │
│   conversion_rate: 27.5                                          │
│ }                                                                 │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────┐
│   MATCHING ENHANCED WITH PERSONALIZATION BOOST                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ When user searches for guides:                                  │
│                                                                    │
│ 1. Use existing rule-based scoring:                             │
│    matchScore = computeMatchScore(guide, basicPrefs)           │
│    (age, price, rating, verification, availability, city)      │
│    → Score: 0-100                                               │
│                                                                    │
│ 2. Apply PERSONALIZATION BOOST:                                 │
│    boostFactor = personalizationBoost(                          │
│      userProfile,      ← From user_preference_profiles          │
│      guide,            ← Guide data                              │
│      guideStats        ← From guide_performance_stats           │
│    )                                                              │
│    → boostFactor: 0.95-1.15 (5-15% boost max)                   │
│                                                                    │
│ 3. Final Score:                                                  │
│    finalScore = matchScore × boostFactor                        │
│    → Capped at 0-100                                            │
│                                                                    │
│ 4. Rank guides by finalScore (highest first)                    │
│                                                                    │
│ Boost factors breakdown:                                         │
│   - Price affinity: ±5%                                         │
│     (If user prefers ฿8K and guide is ฿7.5K = +3%)             │
│   - Age affinity: ±3%                                           │
│     (If user likes 28 and guide is 27 = +2%)                    │
│   - Verified affinity: ±4%                                      │
│     (If user prefers verified and guide is = +4%)               │
│   - City affinity: ±2%                                          │
│     (If user prefers Bangkok and guide is = +2%)                │
│   - Engagement boost: ±3%                                       │
│     (If user clicked this guide before = +3%)                   │
│                                                                    │
│ MAX POSSIBLE TOTAL BOOST: 17% (capped at 15% for safety)       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────┐
│              PERSONALIZED RESULTS RETURNED                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ GET /api/guides/match                                           │
│ (Or any ranking API call)                                       │
│                                                                    │
│ Returns guides in order:                                        │
│ [                                                                 │
│   {                                                               │
│     id: 'G-456',                                                 │
│     name: 'Marco',                                               │
│     price: 7500,                                                 │
│     age: 27,                                                     │
│     verified: true,                                              │
│     city: 'Bangkok',                                             │
│     rating: 4.8,                                                 │
│     matchScore: 78.5,  ← Base score (rule-based)                │
│     personalizationBoost: 1.09,  ← 9% boost                     │
│     finalScore: 85.6,  ← With personalization                   │
│     boostBreakdown: {                                            │
│       priceAffinity: 1.03,     ← Likes this price range         │
│       ageAffinity: 1.02,       ← Near preferred age             │
│       verifiedAffinity: 1.04,  ← Prefers verified               │
│       cityAffinity: 1.00,      ← Doesn't match city pref        │
│       engagementBoost: 1.00    ← Haven't clicked before         │
│     }                                                             │
│   },                                                              │
│   ...                                                             │
│ ]                                                                 │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                                ↓
┌────────────────────────────────────────────────────────────────────┐
│          LOOP CONTINUES (Learning Improves Over Time)             │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ Each new interaction:                                            │
│                                                                    │
│ ✓ Added to user_behavior_events (next trigger)                  │
│ ✓ Updates user_preference_profiles (if batch run or explicit)   │
│ ✓ Updates guide_performance_stats (daily batch)                 │
│ ✓ Next personalization boost is MORE accurate                   │
│                                                                    │
│ Over time:                                                        │
│ Week 1: Generic matching (minimal behavior data)               │
│ Week 2: Price preferences start emerging                       │
│ Week 4: Age + city preferences strengthening                   │
│ Week 8: Full multi-dimensional personalization active         │
│                                                                    │
│ Benefits compound:                                               │
│ - More relevant results → Higher CTR                            │
│ - Higher CTR → More data for learning                           │
│ - Better learning → Even more relevant results                  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Cold Start Strategy

### Problem: New Users (No History)

New user arrives - zero behavior events, no preference profile.

**Solution: Graceful Degradation**

```
┌─────────────────────────────────────────┐
│ Does user have preference profile?      │
├─────────────────────────────────────────┤
│                                         │
│ NO: User is brand new                  │
│ │                                       │
│ └─→ Use DEFAULTS:                      │
│     - No price preference (all allowed) │
│     - No age preference (all allowed)   │
│     - Don't require verified            │
│     - No city preference                │
│     - Use basic matching only           │
│     - Result: Generic top-quality guides│
│                                         │
│ YES: User has some history             │
│ │                                       │
│ └─→ Check confidence_score:            │
│     - < 0.3: Too little data           │
│       Use profile with conservative    │
│       boost values (×0.5)              │
│     - 0.3-0.7: Moderate confidence     │
│       Use full personalization         │
│     - > 0.7: High confidence           │
│       Use full personalization + boost │
│                                         │
└─────────────────────────────────────────┘
```

### Minimum Data Threshold

```
To start personalizing, require:
- At least 3 guide clicks (or 2 bookings)
- Data from at least 3 days apart
- OR explicit user preference input

Until then:
- Show top-rated guides (proven quality)
- Sort by booking frequency (what works)
- Let user refine with filters
- Capture their behavior for future personalization
```

---

## Fallback Logic (Safety)

```
┌──────────────────────────────────────────────────────────┐
│ When things go wrong... (Production safety)             │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ ERROR: Can't fetch user_preference_profiles?           │
│ FALLBACK: Use basic matching (no personalization)      │
│ BEHAVIOR: Continue normally, don't break search        │
│                                                          │
│ ERROR: Preference engine crashes?                       │
│ FALLBACK: No boost applied, use rule-based score only  │
│ BEHAVIOR: User gets generic results, no degradation    │
│                                                          │
│ ERROR: Guide performance stats unavailable?            │
│ FALLBACK: Don't apply engagement boost                 │
│ BEHAVIOR: Use other boost factors (price, age, etc)    │
│                                                          │
│ ERROR: Boost calculation returns invalid result?       │
│ FALLBACK: Clamp to 0.95-1.15 range                     │
│ BEHAVIOR: Continue, don't let bad math break service   │
│                                                          │
│ All errors logged to error tracking                    │
│ Allow graceful degradation == product resilience       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Ranking Influence Summary

### What Gets Personalized

**YES - These are influenced by user behavior:**
- Guide ordering (same quality guides ranked by preference match)
- Boost up/down by 5-15% (personalization layer)
- Result relevance (user gets what they actually want)

**NO - These are NOT influenced by user behavior (Safety):**
- Hard filters (required_verified, required_availability stay rules)
- Base score components (age/price/rating formula untouched)
- Individual guide quality metrics (a 2-star guide stays 2-star)

---

## Data Dependencies

```
trackUserEvent() 
    → user_behavior_events table
    
inferUserPreferences()
    ← user_behavior_events table
    → user_preference_profiles table
    
personalizationBoost()
    ← user_preference_profiles
    ← guide_performance_stats
    → boost factor (0.95-1.15)
    
rankGuidesForUser() [ENHANCED]
    ← Basic matching score
    ← personalizationBoost()
    → Final ranked list
```

---

## Daily Batch Jobs (Non-blocking)

```
1. Update Guide Performance Stats (Midnight UTC)
   └─ COUNT events from last 24h → total_views, total_clicks
   └─ Calculate conversion rates
   └─ ~5 seconds to run
   
2. Recalculate Preference Profiles (Every 6 hours)
   └─ Iterate all users with recent events
   └─ Re-infer preferences from last 30 days
   └─ Most runs: < 1 second
   └─ First run (all users): ~10 seconds
   
3. Archive Old Events (Weekly)
   └─ Move events > 90 days to archive table
   └─ Keep active learning data only
```

