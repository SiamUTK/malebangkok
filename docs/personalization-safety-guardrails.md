# PART G — Privacy & Safety Guardrails

## Responsible AI Personalization Policy

Purpose: Ensure behavioral learning improves user experience without invading privacy or creating unfair bias.

---

## 1. DATA MINIMIZATION RULES

### What We Track (Allowed)

```
✓ Guide interactions:
  - guide_id (public identifier)
  - guide_price (public information)
  - guide_age (public profile)
  - guide_verified_status (public badge)
  - guide_city (public information)
  - guide_rating (public metric)

✓ Behavioral signals:
  - Event type (view, click, book)
  - Timestamp (when happened)
  - Device type (mobile/desktop)
  - Session ID (non-identifying)

✓ Derived preferences (inferred):
  - Preferred price range
  - Preferred age range
  - Prefers verified guides (yes/no)
  - Preferred city
  - [NOT individual guide ratings]
  - [NOT specific searches]
```

### What We DON'T Track (Prohibited)

```
✗ Personal identifiable information:
  - User email (we know it, but don't store in events)
  - User name (we know it, but don't store in events)
  - User phone number (never)
  - User address (never)

✗ Sensitive behavioral data:
  - Which specific guides user looks at (only aggregate)
  - How long user spends on each profile
  - User's search history (only aggregate category)
  - User's previous bookings with specific guides (only count)
  - User's rejection patterns

✗ External enrichment:
  - Cross-site tracking (we don't)
  - IMEI/device IDs (we don't)
  - Location data (precise GPS - we don't)

✗ Inference of sensitive categories:
  - Sexual orientation (even if could infer from guide types)
  - Health information
  - Religion or political beliefs
  - Drug use or addiction patterns
```

---

## 2. RETENTION POLICY (GDPR-Compliant)

### Data Retention Timeline

```
Active Learning Data (user_behavior_events):
├─ Age: 0-90 days
├─ Retention: Maximum 90 days
├─ Reason: Current learning, fresh signals only
└─ Purge: Automated daily deletion script

Archived Events (user_behavior_archive):
├─ Age: 90 days - 2 years
├─ Retention: For compliance, not learning
├─ Reason: Satisfy "right to be forgotten" requests
└─ Auto-purge: After 2 years (legal minimum)

Preference Profiles (user_preference_profiles):
├─ Age: Indefinite (updated daily)
├─ Retention: Only while user account active
├─ Reason: User benefit (personalization)
└─ Delete: When user deletes account

Guide Performance Stats (guide_performance_stats):
├─ Age: 90 days (refreshed daily)
├─ Retention: Rolling 90-day window
├─ Reason: Current performance only
└─ Note: Old data aggregated into "all-time" totals
```

### User Deletion (Right to Be Forgotten)

When user requests deletion:

```
1. IMMEDIATE (< 1 hour):
   - Delete user_preference_profiles row
   - Delete user_id from active events (prevent future learning)
   - Flag account as "do not track"

2. Within 7 days:
   - Archive user_behavior_events → user_behavior_archive
   - Delete from user_behavior_events
   - Delete from personalization_boost_log

3. After 2 years:
   - Delete from user_behavior_archive
   - User completely removed from system

Exception: Some data retention may be required by law
- Payment records (7 years for taxes)
- Booking records (for dispute resolution)
Never: User's personal preferences/behavior
```

---

## 3. ANONYMIZATION STRATEGY

### How Users Are Anonymized

```
In behavior_events table:
✓ User stored as: user_id (integer)
✓ NOT stored: email, name, address
✓ Events completely anonymous once user_id removed

In preference_profiles table:
✓ User stored as: user_id (integer)
✓ Profile contains only: price range, age range, verified preference, city
✓ No way to re-identify user from these preferences alone

In boost_log table (debugging):
✓ User stored as: user_id (integer)
✓ NOT stored: any identifying information
✓ Only boost calculations visible
```

### Data Minimization During Collection

We ALWAYS hash/anonymize before storage:

```javascript
// ✓ GOOD: Anonymize immediately
const userIdForDb = userId; // Keep as-is (already numeric)
const metadataForDb = {
  guide_price: guidePrice,
  guide_age: guideAge,
  guide_verified: isVerified,
  guide_city: cityName
  // Note: NO user identification in metadata
};

// ✗ BAD: Don't do this
const metadata = {
  user_email: userEmail,
  user_name: userName,
  user_phone: userPhone
};
```

---

## 4. ABUSE PREVENTION

### Detection & Mitigation

#### A. Malicious Clicks (Gaming CTR)

Problem: User artificially clicks guides to pump their ranking

Detection:
```
- 50+ clicks in 1 hour = suspicious
- 200+ clicks in 1 day = definitely spam
- Clicks on random unrelated guides = flag
- Rapid repeat clicks (< 1 second) = bot
```

Mitigation:
```
✓ Rate limiting (6-8 clicks per hour per user)
✓ Deduplication (ignore identical clicks < 5 sec apart)
✓ Pattern analysis (don't count 20 clicks on one guide in 1 hour)
✓ Human review (if flagged, disable boost temporarily)
✓ No penalties (never reduce guide ranking, just ignore spam)
```

#### B. Preference Manipulation

Problem: Guide owner creates fake accounts to build preference signal

Detection:
```
- New account with 30 guide clicks in first week = unusual
- All clicks on same guide = suspicious
- All clicks on same city (that guide's city) = suspicious
- Bookings from fake accounts = fraud
```

Mitigation:
```
✓ Account age requirement before personalization active (14 days minimum)
✓ Require booking history for high-weight personalization
✓ Limit boost from new users (< 0.3 confidence)
✓ Review new accounts with unusual patterns
```

#### B. Bias & Discrimination Concerns

Problem: Personalization reinforces biases (e.g., only shows young guides)

Detection:
```
- Track diversity of recommendations per user
- Alert if user only sees 1 age range
- Monitor if certain demographics excluded
```

Mitigation:
```
✓ Diversity floor: Always include ≥ 20% outside preferred age range
✓ Randomization: Shuffle top results occasionally (user doesn't notice)
✓ Opt-out: User can disable personalization anytime
✓ Transparency: Show user their preference profile
✓ Review: Quarterly audit of recommendation diversity
```

---

## 5. BIAS MONITORING

### Regular Audits

**Quarterly Fairness Report**

```
For each demographic segment (age range, city, new vs repeat):

1. Coverage: Do personalized recommendations include diverse guides?
   Target: ≥ 80% of guides visible to each user segment
   
2. Representation: Do guides from underrepresented groups appear?
   Target: No demographic should drop > 20% from baseline
   
3. Conversion: Do all user segments convert at similar rates?
   Target: No segment should convert < 60% of average
   
4. Feedback: Are low-ranking guides getting any bookings?
   Target: Top 100 guides should get 70% bookings, rest get 30%
   (Ensures long tail isn't completely hidden)
```

**Bias Prevention Checklist**

- [ ] No personalization based on: race, religion, sexual orientation, political views
- [ ] No personalization that excludes: age extremes, less popular city guides, new guides
- [ ] No personalization that over-weights: high-priced guides, foreign guides, guides with accents
- [ ] No correlation with "expensive = better" (breaks for budget users)
- [ ] No filter bubbles (randomize occasionally)

---

## 6. TRANSPARENCY & USER CONTROL

### What Users Can See

**Preference Profile Endpoint**

```
GET /api/user/preferences

Returns to authenticated user:
{
  preferred_price_min: 5500,
  preferred_price_max: 9000,
  preferred_age_min: 26,
  preferred_age_max: 32,
  prefers_verified: true,
  preferred_city: "Bangkok",
  confidence_score: 0.75,
  based_on_events: 47  ← How many actions created this profile
}

User can then:
✓ Validate ("Yes, this matches me")
✓ Correct ("I actually prefer cheaper")
✓ Delete ("Clear my preferences, show me variety")
✓ Disable ("Don't personalize for me")
```

### User Preferences Control

```
/api/user/preferences/update

User can manually override:
{
  "preferred_price_min": 3000,  // Override inferred
  "preferred_price_max": 6000,  // Override inferred
  "personalization_enabled": false  // Opt out completely
}

Effect:
- If manual override set: Use user's input, not learned profile
- If personalization disabled: No boost applied, show generic results
- User always wins over algorithm
```

---

## 7. SAFETY GUARDRAILS (Technical)

### Boost Factor Limits

```
Maximum total boost: 1.15 (15% improvement)
Minimum total boost: 0.95 (15% penalty)

Why caps?
- Too high: Biases results too much, limits user discovery
- Too low: Pointless, effort wasted

Per-component caps:
- Price affinity: ±5%
- Age affinity: ±3%
- Verified affinity: ±4%
- City affinity: ±2%
- Engagement bonus: ±3%
Total: ±17% possible, capped at ±15%

These numbers conservatively avoid extreme personalization.
```

### Mode Degradation (Safety First)

```
If something breaks, system degrades safely:

⚠ Can't fetch user preferences:
  → Fall back to basic matching (no boost)
  → Result: User sees generic ranked guides
  → Severity: No problem, normal browsing

⚠ Preference inference crashes:
  → Don't apply personalization
  → Keep basic ranking
  → Severity: Minor (learning temporarily disabled)

⚠ Boost calculation overflows:
  → Return boost = 1.0 (no boost)
  → Fall back to rule-based ranking
  → Severity: Recoverable, try again next search

⚠ Database slow (> 500ms):
  → Timeout, use cached value or default
  → Never let learning slow down response
  → Severity: Timeout handled gracefully
```

---

## 8. COMPLIANCE CHECKLIST

### GDPR

- [ ] Users can request data export (all events + preferences)
- [ ] Users can request deletion (delete events, archive, purge after 2 years)
- [ ] Users can opt out of personalization (disable flag)
- [ ] Data retention policy documented and enforced
- [ ] User consent recorded (for analytics)
- [ ] Privacy impact assessment completed
- [ ] Data processing agreement with services (if using 3rd party)

### CCPA

- [ ] Disclose data collection (do in Privacy Policy)
- [ ] Allow opt-out of selling (we don't sell, so N/A)
- [ ] Provide data deletion (user can request)
- [ ] Provide data access (user can view preferences)

### Local Thailand

- [ ] Thailand Personal Data Protection Act (PDPA)
- [ ] Require consent before tracking (consent banner)
- [ ] Right to access (user sees preferences)
- [ ] Right to deletion (automated process)
- [ ] Data security (encryption, access controls)

### Internal

- [ ] No tracking of children (users < 18, if applicable)
- [ ] No discriminatory tracking
- [ ] No health/medical inference
- [ ] Regular audits (quarterly bias review)
- [ ] Employee training (data ethics)

---

## 9. INCIDENT RESPONSE

### If Data Breach Occurs

```
1. Assess: What data was exposed?
   - Behavior events? (Non-identifying, low risk)
   - Preference profiles? (Non-identifying, low risk)
   - User IDs? (Identifying, medium risk)
   
2. Notify:
   - If user IDs exposed + anything else: Notify users within 7 days
   - If just events/preferences: May not need notification
   
3. Remediate:
   - Delete exposed data from live tables
   - Archive old data may already be purged (90-day limit)
   - Encrypted backup unaffected
   
4. Prevent Future:
   - Review database access logs
   - Add monitoring for unusual queries
   - Update retention policies
```

### Data Minimization Helps

Because we only store:
- Guide IDs (public)
- User IDs (numeric, not identifying)
- Preferences (can't identify person from "likes 28-year-olds")

A breach exposes minimal sensitive data.

If we stored: name, email, phone, history... breach would be catastrophic.
Instead, breach is: "Someone saw engagement stats" → Low impact

---

## 10. POLICY UPDATES & COMMUNICATION

### If Personalization Changes

When algorithm changes, preference inference updates, or new signals added:

1. **Announcement:** Blog post explaining changes
2. **User Notice:** Email to all users
3. **Opt-out:** Provide way to disable before rollout
4. **Transparency:** Show new boost breakdown
5. **Feedback:** Ask users if recommendations better/worse

Example:
```
"We've updated our matching algorithm to also consider
your preferred city. Previously, guides from your city
had no boost. Now, if you've searched Bangkok guides,
Bangkok guides get a slight 2% ranking boost.

You can disable this anytime in your preferences.
We think this will improve recommendations.

Questions? Contact privacy@malebangkok.com"
```

---

## Summary: Responsible AI Principles

```
┌─────────────────────────────────────────────────────────┐
│         RESPONSIBLE AI PERSONALIZATION                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 1. Minimization: Only track essential signals          │
│    └─ Price, age, verified status, city               │
│    └─ NOT: Detailed search history, rejections        │
│                                                         │
│ 2. Fairness: Monitor and audit for bias                │
│    └─ Quarterly diversity reports                      │
│    └─ Protect underrepresented guides                  │
│                                                         │
│ 3. Transparency: Users understand and control          │
│    └─ View their preference profile                    │
│    └─ Override or disable anytime                      │
│                                                         │
│ 4. Safety: Guardrails prevent misuse                   │
│    └─ Max 15% boost (not extreme)                      │
│    └─ Graceful degradation on errors                   │
│    └─ Rate limiting against spam                       │
│                                                         │
│ 5. Privacy: Data respects user rights                  │
│    └─ Right to access (view preferences)               │
│    └─ Right to delete (clear history)                  │
│    └─ Right to opt-out (disable personalization)       │
│    └─ 90-day retention (not forever)                   │
│                                                         │
│ 6. Accountability: Regular audits and reviews          │
│    └─ Quarterly fairness reports                       │
│    └─ Incident response plan                           │
│    └─ Employee training                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

