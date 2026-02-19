-- PART B — AI Personalization Layer Database Schema
-- MySQL 8.0+ Migration Script
-- Purpose: Tables for behavior tracking and preference learning

-- ============================================================================
-- TABLE 1: user_behavior_events
-- ============================================================================
-- Purpose: Immutable log of user interactions (guide views, clicks, bookings)
-- Growth: ~10K-100K rows/day depending on user activity
-- Retention: 90 days of active data + periodic archival

CREATE TABLE IF NOT EXISTS user_behavior_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  
  -- User identification
  user_id INT NOT NULL,
  
  -- Event classification
  event_type VARCHAR(50) NOT NULL,
  -- Values: 'guide_viewed', 'guide_clicked', 'booking_started', 
  --         'booking_completed', 'matching_used', 'search_performed'
  
  -- Reference to target entity (nullable for some events)
  guide_id VARCHAR(50),
  booking_id VARCHAR(50),
  
  -- Event metadata (JSON for flexibility)
  metadata JSON,
  -- Example structure:
  -- {
  --   "guide_price": 7500,
  --   "guide_age": 28,
  --   "guide_verified": true,
  --   "guide_city": "Bangkok",
  --   "guide_rating": 4.8,
  --   "position": 3,  // Position in list (for CTR tracking)
  --   "session_id": "SESSION_ABC123",
  --   "device": "mobile",
  --   "search_filters": {"city": "Bangkok", "priceMax": 8000}
  -- }
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  KEY idx_user_id (user_id),
  KEY idx_event_type (event_type),
  KEY idx_guide_id (guide_id),
  KEY idx_created_at (created_at),
  KEY idx_user_event_date (user_id, event_type, created_at),
  
  -- Foreign key (soft - guides can be deleted)
  CONSTRAINT fk_behavior_user FOREIGN KEY (user_id) 
    REFERENCES users(id) ON DELETE CASCADE
);

-- Partitioning strategy (for large scale):
-- ALTER TABLE user_behavior_events 
-- PARTITION BY RANGE (YEAR(created_at) * 10000 + MONTH(created_at) * 100 + DAY(created_at)) ...);

-- ============================================================================
-- TABLE 2: user_preference_profiles
-- ============================================================================
-- Purpose: Learned user preferences (inferred from behavior)
-- One row per user with preference profile
-- Updated: Only when explicitly recalculated (daily batch or on-demand)

CREATE TABLE IF NOT EXISTS user_preference_profiles (
  user_id INT PRIMARY KEY,
  
  -- Price preferences (THB)
  preferred_price_min INT DEFAULT 1500,
  preferred_price_max INT DEFAULT 8000,
  
  -- Age preferences (years)
  preferred_age_min INT DEFAULT 24,
  preferred_age_max INT DEFAULT 40,
  
  -- Verification preference (1 = strongly prefers, 0 = neutral)
  prefers_verified TINYINT(1) DEFAULT 0,
  
  -- City preference (empty string = no city preference)
  preferred_city VARCHAR(50) DEFAULT '',
  
  -- Confidence score (0-1, based on data quality)
  -- 0.0-0.3: Little data, use conservative boost
  -- 0.3-0.7: Moderate data, use normal boost
  -- 0.7-1.0: Strong data, use full boost + trusted
  confidence_score DECIMAL(2,2) DEFAULT 0.0,
  
  -- Data quality metrics
  behavior_events_count INT DEFAULT 0,  -- Total events contributing
  days_with_activity INT DEFAULT 0,     -- Span of activity
  last_recalculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key
  CONSTRAINT fk_pref_user FOREIGN KEY (user_id) 
    REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
ALTER TABLE user_preference_profiles ADD KEY idx_confidence (confidence_score);
ALTER TABLE user_preference_profiles ADD KEY idx_updated (updated_at);

-- ============================================================================
-- TABLE 3: guide_performance_stats
-- ============================================================================
-- Purpose: Aggregate stats for guides (used for popularity ranking)
-- One row per guide
-- Updated: Daily batch job (aggregates from user_behavior_events)

CREATE TABLE IF NOT EXISTS guide_performance_stats (
  guide_id VARCHAR(50) PRIMARY KEY,
  
  -- View tracking
  total_views INT DEFAULT 0,
  total_clicks INT DEFAULT 0,
  total_bookings INT DEFAULT 0,
  
  -- Calculated rate
  conversion_rate DECIMAL(5,2) DEFAULT 0.0,  -- (clicks / views) * 100
  click_through_rate DECIMAL(5,2) DEFAULT 0.0,  -- (bookings / clicks) * 100
  
  -- Time-based metrics
  views_last_7_days INT DEFAULT 0,
  clicks_last_7_days INT DEFAULT 0,
  bookings_last_7_days INT DEFAULT 0,
  
  -- Trending indicator (for algorithm boost)
  trending_score DECIMAL(3,2) DEFAULT 1.0,  -- 0.8-1.3, affects ranking
  
  -- Timestamps
  last_viewed TIMESTAMP NULL,
  last_booked TIMESTAMP NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  KEY idx_total_views (total_views),
  KEY idx_conversion_rate (conversion_rate),
  KEY idx_trending (trending_score),
  KEY idx_last_updated (last_updated)
);

-- Comment explaining calculation frequency
-- These stats are updated daily (3 AM UTC) via batch job:
-- SELECT guide_id, COUNT(*) as views FROM user_behavior_events 
-- WHERE event_type = 'guide_viewed' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
-- GROUP BY guide_id;

-- ============================================================================
-- TABLE 4: user_behavior_archive
-- ============================================================================
-- Purpose: Historical data (older than 90 days, for compliance)
-- Structure: Same as user_behavior_events but for archival
-- Retention: 1-2 years (meets GDPR right-to-deletion on request)

CREATE TABLE IF NOT EXISTS user_behavior_archive (
  id BIGINT PRIMARY KEY,
  user_id INT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  guide_id VARCHAR(50),
  booking_id VARCHAR(50),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  KEY idx_user_id (user_id),
  KEY idx_archived_at (archived_at)
);

-- Archival process (weekly, Sundays 4 AM UTC):
-- INSERT INTO user_behavior_archive 
-- SELECT * FROM user_behavior_events 
-- WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
-- 
-- DELETE FROM user_behavior_events 
-- WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- ============================================================================
-- TABLE 5: personalization_boost_log (Optional, for debugging)
-- ============================================================================
-- Purpose: Debug log showing boost calculations (optional, helps with QA)
-- Only store samples or errors to avoid excessive logging

CREATE TABLE IF NOT EXISTS personalization_boost_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  
  user_id INT NOT NULL,
  guide_id VARCHAR(50) NOT NULL,
  
  -- Components of boost
  base_match_score DECIMAL(5,2),
  price_affinity DECIMAL(3,2),
  age_affinity DECIMAL(3,2),
  verified_affinity DECIMAL(3,2),
  city_affinity DECIMAL(3,2),
  engagement_bonus DECIMAL(3,2),
  
  final_boost_factor DECIMAL(4,3),  -- 0.95-1.15
  final_score DECIMAL(5,2),
  
  -- Why was this calculated?
  event_type VARCHAR(50),  -- 'search', 'matching', 'browse'
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  KEY idx_user_id (user_id),
  KEY idx_guide_id (guide_id),
  KEY idx_created_at (created_at)
);

-- Note: This table is OPTIONAL and should only store samples (e.g., 1% of all boosts)
-- to avoid excessive storage. Use for debugging and analytics only.

-- ============================================================================
-- INITIAL DATA & CONSTRAINTS
-- ============================================================================

-- Setting initial preferences for existing users (if migrating):
-- INSERT INTO user_preference_profiles (user_id)
-- SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM user_preference_profiles);

-- Verify data types align with main application:
-- - user_id should match users.id type
-- - guide_id should match guides.id type
-- - booking_id should match bookings.id type

-- ============================================================================
-- BATCH JOB PROCEDURES (To be run separately)
-- ============================================================================

-- NOTE: These are pseudocode. Actual implementation in Node.js service.

-- Job 1: Update guide_performance_stats (Daily, 3 AM UTC)
-- ```sql
-- UPDATE guide_performance_stats gps
-- SET total_views = (
--   SELECT COUNT(*) FROM user_behavior_events 
--   WHERE guide_id = gps.guide_id AND event_type = 'guide_viewed'
-- ),
-- total_clicks = (
--   SELECT COUNT(*) FROM user_behavior_events 
--   WHERE guide_id = gps.guide_id AND event_type = 'guide_clicked'
-- ),
-- total_bookings = (
--   SELECT COUNT(*) FROM user_behavior_events 
--   WHERE guide_id = gps.guide_id AND event_type = 'booking_completed'
-- ),
-- conversion_rate = ROUND(
--   (total_clicks / GREATEST(total_views, 1)) * 100, 2
-- ),
-- last_updated = NOW();
-- ```

-- Job 2: Archive old behavior events (Weekly, Sunday 4 AM UTC)
-- ```sql
-- INSERT INTO user_behavior_archive
-- SELECT * FROM user_behavior_events
-- WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
-- 
-- DELETE FROM user_behavior_events
-- WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
-- ```

-- Job 3: Recalculate user_preference_profiles (Every 6 hours)
-- NOTE: This job is complex and implemented in Node.js
-- pseudocode:
-- For each user with recent events:
--   - Get latest 20 guide_clicked events
--   - Extract prices, ages, verified status, cities
--   - Calculate preferred ranges
--   - Update user_preference_profiles

-- ============================================================================
-- VERIFICATION & MONITORING
-- ============================================================================

-- Check table sizes:
-- SELECT 
--   table_name,
--   ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
-- FROM information_schema.TABLES
-- WHERE table_name IN ('user_behavior_events', 'user_preference_profiles', 'guide_performance_stats');

-- Check event volume:
-- SELECT 
--   event_type,
--   COUNT(*) as count,
--   DATE(created_at) as date
-- FROM user_behavior_events
-- GROUP BY event_type, DATE(created_at)
-- ORDER BY date DESC;

-- ============================================================================
