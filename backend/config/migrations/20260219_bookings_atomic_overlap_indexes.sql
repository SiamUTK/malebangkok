-- MySQL 8.0+ safe migration for bookings overlap-read performance
-- Purpose: Add missing composite indexes used by atomic booking conflict detection

DELIMITER $$

DROP PROCEDURE IF EXISTS migrate_bookings_atomic_overlap_indexes $$
CREATE PROCEDURE migrate_bookings_atomic_overlap_indexes()
BEGIN
  DECLARE v_bookings_exists INT DEFAULT 0;
  DECLARE v_idx_exists INT DEFAULT 0;

  SELECT COUNT(*) INTO v_bookings_exists
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bookings';

  IF v_bookings_exists = 1 THEN
    SELECT COUNT(*) INTO v_idx_exists
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      AND INDEX_NAME = 'idx_bookings_guide_status_date';

    IF v_idx_exists = 0 THEN
      ALTER TABLE bookings
        ADD INDEX idx_bookings_guide_status_date (guide_id, status, booking_date);
    END IF;

    SELECT COUNT(*) INTO v_idx_exists
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      AND INDEX_NAME = 'idx_bookings_guide_status_end_date';

    IF v_idx_exists = 0 THEN
      ALTER TABLE bookings
        ADD INDEX idx_bookings_guide_status_end_date (guide_id, status, booking_end_date);
    END IF;

    SELECT COUNT(*) INTO v_idx_exists
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      AND INDEX_NAME = 'idx_bookings_guide_booking_window';

    IF v_idx_exists = 0 THEN
      ALTER TABLE bookings
        ADD INDEX idx_bookings_guide_booking_window (guide_id, booking_date, booking_end_date);
    END IF;
  END IF;
END $$

DELIMITER ;

CALL migrate_bookings_atomic_overlap_indexes();
DROP PROCEDURE migrate_bookings_atomic_overlap_indexes;
