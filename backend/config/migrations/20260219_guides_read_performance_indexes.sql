-- MySQL 8.0+ safe migration for guides read performance
-- Purpose: Add missing indexes for pagination and recommendation prefilter reads

DELIMITER $$

DROP PROCEDURE IF EXISTS migrate_guides_read_performance_indexes $$
CREATE PROCEDURE migrate_guides_read_performance_indexes()
BEGIN
  DECLARE v_guides_exists INT DEFAULT 0;
  DECLARE v_idx_exists INT DEFAULT 0;
  DECLARE v_col_exists INT DEFAULT 0;

  SELECT COUNT(*) INTO v_guides_exists
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'guides';

  IF v_guides_exists = 1 THEN
    SELECT COUNT(*) INTO v_col_exists
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'guides' AND COLUMN_NAME = 'is_active';

    IF v_col_exists = 1 THEN
      SELECT COUNT(*) INTO v_idx_exists
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'guides' AND INDEX_NAME = 'idx_guides_is_active_created_at';

      IF v_idx_exists = 0 THEN
        ALTER TABLE guides ADD INDEX idx_guides_is_active_created_at (is_active, created_at DESC);
      END IF;

      SELECT COUNT(*) INTO v_idx_exists
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'guides' AND INDEX_NAME = 'idx_guides_is_active_is_available';

      IF v_idx_exists = 0 THEN
        ALTER TABLE guides ADD INDEX idx_guides_is_active_is_available (is_active, is_available);
      END IF;
    END IF;

    SELECT COUNT(*) INTO v_col_exists
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'guides' AND COLUMN_NAME = 'base_price';

    IF v_col_exists = 1 THEN
      SELECT COUNT(*) INTO v_idx_exists
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'guides' AND INDEX_NAME = 'idx_guides_base_price';

      IF v_idx_exists = 0 THEN
        ALTER TABLE guides ADD INDEX idx_guides_base_price (base_price);
      END IF;
    END IF;

    SELECT COUNT(*) INTO v_col_exists
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'guides' AND COLUMN_NAME = 'avg_rating';

    IF v_col_exists = 1 THEN
      SELECT COUNT(*) INTO v_idx_exists
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'guides' AND INDEX_NAME = 'idx_guides_avg_rating';

      IF v_idx_exists = 0 THEN
        ALTER TABLE guides ADD INDEX idx_guides_avg_rating (avg_rating);
      END IF;
    END IF;

    SELECT COUNT(*) INTO v_col_exists
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'guides' AND COLUMN_NAME = 'city';

    IF v_col_exists = 1 THEN
      SELECT COUNT(*) INTO v_idx_exists
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'guides' AND INDEX_NAME = 'idx_guides_city';

      IF v_idx_exists = 0 THEN
        ALTER TABLE guides ADD INDEX idx_guides_city (city);
      END IF;
    END IF;
  END IF;
END $$

DELIMITER ;

CALL migrate_guides_read_performance_indexes();
DROP PROCEDURE migrate_guides_read_performance_indexes;
