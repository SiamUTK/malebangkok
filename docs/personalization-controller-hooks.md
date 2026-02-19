# PART F — Event Tracking Hooks (Controller Integration)

## Overview

This document shows where and how to trigger behavior tracking in existing controllers.

Key principle: **Track events immediately as they happen, don't wait.**

---

## 1. Guide Controller — Track on View & Click

### File: `backend/controllers/guideController.js`

**When to track:**
- User views a guide's profile page
- User views guide in list (optional, high volume)

```javascript
// ============================================================================
// GUIDE LIST WITH TRACKING
// ============================================================================

const behaviorTracking = require('../services/behaviorTrackingService');

/**
 * GET /api/guides
 * List guides (possibly filtered)
 * 
 * Track: Both views and clicks depending on context
 */
exports.listGuides = async (req, res) => {
  try {
    // ... existing list logic ...
    
    const guides = await db.query('SELECT * FROM guides WHERE ...');
    
    // If user is authenticated, track that they viewed the guide list
    if (req.user && req.user.id) {
      const metadata = {
        filter_city: req.query.city || null,
        filter_price_max: req.query.priceMax || null,
        filter_rating_min: req.query.ratingMin || null,
        result_count: guides.length,
        device: req.get('user-agent').includes('Mobile') ? 'mobile' : 'desktop'
      };
      
      // Non-blocking tracking
      behaviorTracking.trackUserEvent(
        req.user.id,
        'search_performed',  // Different from 'guide_viewed'
        null,
        metadata
      );
    }
    
    res.json(guides);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// GUIDE DETAIL VIEW WITH TRACKING
// ============================================================================

/**
 * GET /api/guides/:id
 * View guide profile details
 * 
 * Track: guide_viewed event (important for learning)
 */
exports.getGuide = async (req, res) => {
  try {
    const guideId = req.params.id;
    const guide = await db.query('SELECT * FROM guides WHERE id = ?', [guideId]);
    
    if (!guide) {
      return res.status(404).json({ error: 'Guide not found' });
    }
    
    // IMPORTANT: Track that user viewed this guide
    if (req.user && req.user.id) {
      const metadata = {
        guide_price: guide.base_price,
        guide_age: guide.age,
        guide_verified: guide.verification_status === 'verified',
        guide_city: guide.city,
        guide_rating: guide.avg_rating,
        device: req.get('user-agent').includes('Mobile') ? 'mobile' : 'desktop',
        session_id: req.sessionID
      };
      
      // Fire and forget - don't wait
      behaviorTracking.trackUserEvent(
        req.user.id,
        'guide_viewed',
        guideId,
        metadata
      );
    }
    
    res.json(guide);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// GUIDE CARD CLICK (When user clicks from list to detail)
// ============================================================================

/**
 * POST /api/guides/:id/click
 * Track when user clicks a guide card
 * 
 * Called from: GuideCard.jsx onClick handler
 * 
 * Track: guide_clicked event
 */
exports.clickGuide = async (req, res) => {
  try {
    const guideId = req.params.id;
    const { position } = req.body; // Position in list (for analysis)
    
    const guide = await db.query('SELECT * FROM guides WHERE id = ?', [guideId]);
    
    if (req.user && req.user.id) {
      const metadata = {
        guide_price: guide.base_price,
        guide_age: guide.age,
        guide_verified: guide.verification_status === 'verified',
        guide_city: guide.city,
        guide_rating: guide.avg_rating,
        card_position: position || 0, // Which spot in results
        device: req.get('user-agent').includes('Mobile') ? 'mobile' : 'desktop'
      };
      
      behaviorTracking.trackUserEvent(
        req.user.id,
        'guide_clicked',
        guideId,
        metadata
      );
    }
    
    res.json({ success: true, guide_id: guideId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

## 2. Matching Controller — Track Matching Usage

### File: `backend/controllers/guideController.js` (or matchingController.js)

**When to track:**
- User uses the AI matching feature
- User applies filters

```javascript
const behaviorTracking = require('../services/behaviorTrackingService');
const aiMatching = require('../services/aiMatchingService');

/**
 * POST /api/guides/match
 * AI matching feature
 * 
 * Track: matching_used event
 */
exports.matchGuides = async (req, res) => {
  try {
    const { location, ageMin, ageMax, priceMin, priceMax, verified } = req.body;
    
    const preferences = {
      preferredAgeMin: ageMin,
      preferredAgeMax: ageMax,
      priceMin,
      priceMax,
      verifiedOnly: verified
    };
    
    // Get all guides
    const guides = await db.query('SELECT * FROM guides');
    
    // Rank with matching
    const matches = aiMatching.rankGuidesForUser(preferences, guides);
    
    // TRACKING: User used matching feature
    if (req.user && req.user.id) {
      const metadata = {
        filter_location: location,
        filter_age_min: ageMin,
        filter_age_max: ageMax,
        filter_price_min: priceMin,
        filter_price_max: priceMax,
        filter_verified_only: verified,
        results_count: matches.length,
        device: req.get('user-agent').includes('Mobile') ? 'mobile' : 'desktop'
      };
      
      behaviorTracking.trackUserEvent(
        req.user.id,
        'matching_used',
        null,  // No specific guide
        metadata
      );
    }
    
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

## 3. Booking Controller — Track Booking Flow

### File: `backend/controllers/bookingController.js`

**When to track:**
- User starts booking (form opens)
- User completes booking (payment successful)

```javascript
const behaviorTracking = require('../services/behaviorTrackingService');

/**
 * POST /api/bookings
 * Create booking
 * 
 * Track: booking_started and booking_completed
 */
exports.createBooking = async (req, res) => {
  try {
    const {
      guideId,
      sessionDate,
      sessionTime,
      duration,
      specialRequests
    } = req.body;
    
    // Get guide details
    const guide = await db.query('SELECT * FROM guides WHERE id = ?', [guideId]);
    
    // TRACKING: User started booking
    if (req.user) {
      const metadata = {
        guide_id: guideId,
        guide_price: guide.base_price,
        guide_name: guide.name,
        session_date: sessionDate,
        duration_minutes: duration,
        has_special_requests: Boolean(specialRequests),
        device: req.get('user-agent').includes('Mobile') ? 'mobile' : 'desktop'
      };
      
      behaviorTracking.trackUserEvent(
        req.user.id,
        'booking_started',
        guideId,
        metadata
      );
    }
    
    // Create booking record
    const booking = await db.query(
      'INSERT INTO bookings (user_id, guide_id, session_date, session_time, duration, status) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, guideId, sessionDate, sessionTime, duration, 'pending']
    );
    
    res.json({ 
      success: true, 
      booking_id: booking.insertId 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/bookings/:id/confirm
 * Confirm booking after payment
 * 
 * Track: booking_completed (CRITICAL for learning)
 */
exports.confirmBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await db.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    const guide = await db.query('SELECT * FROM guides WHERE id = ?', [booking.guide_id]);
    
    // Update booking status
    await db.query('UPDATE bookings SET status = ? WHERE id = ?', ['confirmed', bookingId]);
    
    // TRACKING: Booking completed (payment successful)
    if (booking.user_id) {
      const metadata = {
        guide_id: guide.id,
        guide_name: guide.name,
        guide_price: guide.base_price,
        booking_date: new Date().toISOString(),
        session_date: booking.session_date,
        session_time: booking.session_time,
        duration: booking.duration,
        total_paid: booking.total_price // If calculated
      };
      
      // This is HIGH PRIORITY tracking - high value signal
      behaviorTracking.trackUserEvent(
        booking.user_id,
        'booking_completed',  // MOST IMPORTANT signal
        guide.id,
        metadata
      );
    }
    
    res.json({ success: true, booking_id: bookingId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

## 4. Frontend Integration (React)

### File: `frontend/src/components/GuideCard.jsx`

```javascript
import { useNavigate } from 'react-router-dom';
import { trackUserEvent } from '../utils/analytics'; // From analytics work
import axios from 'axios';

export const GuideCard = ({ guide, position }) => {
  const navigate = useNavigate();
  
  const handleCardClick = async () => {
    // Track click on backend
    try {
      await axios.post(`/api/guides/${guide.id}/click`, {
        position: position
      });
    } catch (error) {
      console.error('Failed to track click:', error);
      // Don't let tracking failure block navigation
    }
    
    // Navigate to detail
    navigate(`/guides/${guide.id}`);
  };
  
  return (
    <div onClick={handleCardClick} className="guide-card">
      {/* Card content */}
    </div>
  );
};
```

### File: `frontend/src/pages/GuideProfile.jsx`

```javascript
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

export const GuideProfile = () => {
  const { guideId } = useParams();
  
  useEffect(() => {
    // Fetch guide - this triggers backend tracking
    axios.get(`/api/guides/${guideId}`)
      .then(res => {
        // Guide automatically tracked by backend
      })
      .catch(err => console.error('Error fetching guide:', err));
  }, [guideId]);
  
  return (
    // Profile content
  );
};
```

### File: `frontend/src/pages/BookingFlow.jsx`

```javascript
import { useState } from 'react';
import axios from 'axios';

export const BookingFlow = ({ guide }) => {
  const [step, setStep] = useState(1);
  
  const handleBookingSubmit = async (bookingData) => {
    try {
      // POST to create booking - triggers 'booking_started' event
      const response = await axios.post('/api/bookings', {
        guideId: guide.id,
        sessionDate: bookingData.date,
        sessionTime: bookingData.time,
        duration: bookingData.duration,
        specialRequests: bookingData.requests
      });
      
      // Proceed to payment
      handlePayment(response.data.booking_id);
    } catch (error) {
      console.error('Booking error:', error);
    }
  };
  
  const handlePayment = async (bookingId) => {
    // After successful payment from Stripe:
    try {
      await axios.post(`/api/bookings/${bookingId}/confirm`, {
        paymentId: stripe_payment_id
      });
      // triggers 'booking_completed' event on backend
    } catch (error) {
      console.error('Confirmation error:', error);
    }
  };
  
  return (
    // Booking form
  );
};
```

---

## 5. Matching/Recommendation Page

### File: `frontend/src/pages/Matching.jsx`

```javascript
import { useState } from 'react';
import axios from 'axios';

export const MatchingPage = () => {
  const [filters, setFilters] = useState({
    location: 'Bangkok',
    ageMin: 24,
    ageMax: 40,
    priceMin: 5000,
    priceMax: 8000,
    verified: false
  });
  
  const handleFindMatches = async () => {
    try {
      // POST to matching endpoint - triggers 'matching_used' event
      const response = await axios.post('/api/guides/match', {
        location: filters.location,
        ageMin: filters.ageMin,
        ageMax: filters.ageMax,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        verified: filters.verified
      });
      
      // Display results
      setMatches(response.data);
    } catch (error) {
      console.error('Matching error:', error);
    }
  };
  
  return (
    <div>
      <h1>Find Your Perfect Match</h1>
      {/* Filter controls */}
      <button onClick={handleFindMatches}>
        Find Matches
      </button>
      {/* Results display */}
    </div>
  );
};
```

---

## Summary: Event Triggering Checklist

| Event | Controller | Method | When |
|-------|-----------|--------|------|
| guide_viewed | guideController.getGuide | GET /api/guides/:id | User views profile |
| guide_clicked | guideController.clickGuide | POST /api/guides/:id/click | User clicks card |
| search_performed | guideController.listGuides | GET /api/guides | User searches/filters |
| matching_used | matchingController.matchGuides | POST /api/guides/match | User uses AI matching |
| booking_started | bookingController.createBooking | POST /api/bookings | User starts booking form |
| booking_completed | bookingController.confirmBooking | POST /api/bookings/:id/confirm | Payment successful |

---

## Implementation Order

1. **Phase 1 (Week 1):** Implement guide_viewed + guide_clicked
   - These are core discovery signals
   
2. **Phase 2 (Week 2):** Add booking_started + booking_completed
   - These are high-value conversion signals
   
3. **Phase 3 (Week 3):** Add matching_used + search_performed
   - These refine preference inference

---

## Error Handling Best Practice

Always follow this pattern:

```javascript
// WRONG: Tracking blocks user action
const booking = await trackUserEvent(...);  // Blocks!
const response = await createBooking(...);

// CORRECT: Tracking is async/fire-and-forget
createBooking(...).then(response => {
  // Don't wait for tracking
  trackUserEvent(...);  // Fire and forget
  return response;
});

// OR: Use async without await
trackUserEvent(...).catch(err => {
  console.warn('Tracking failed (non-critical):', err);
});
const response = await createBooking(...);
```

The key: **User never waits for tracking to complete.**

