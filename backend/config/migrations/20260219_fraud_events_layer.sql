-- MySQL 8.0+ migration: lightweight fraud telemetry layer
-- Creates fraud_events table and required read indexes for risk monitoring.

DELIMITER $$

DROP PROCEDURE IF EXISTS migrate_fraud_events_layer $$
CREATE PROCEDURE migrate_fraud_events_layer()
BEGIN
  DECLARE v_table_exists INT DEFAULT 0;
  DECLARE v_index_exists INT DEFAULT 0;

  SELECT COUNT(*) INTO v_table_exists
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fraud_events';

  IF v_table_exists = 0 THEN
    CREATE TABLE fraud_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      booking_id BIGINT UNSIGNED NULL,
      risk_score TINYINT UNSIGNED NOT NULL,
      risk_level ENUM('low', 'medium', 'high', 'critical') NOT NULL,
      event_type VARCHAR(64) NOT NULL,
      signals_json JSON NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT chk_fraud_events_risk_score CHECK (risk_score >= 0 AND risk_score <= 100)
    ) ENGINE=InnoDB;
  END IF;

  SELECT COUNT(*) INTO v_index_exists
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fraud_events'
    AND INDEX_NAME = 'idx_fraud_events_user_created';

  IF v_index_exists = 0 THEN
    ALTER TABLE fraud_events
      ADD INDEX idx_fraud_events_user_created (user_id, created_at);
  END IF;

  SELECT COUNT(*) INTO v_index_exists
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'fraud_events'
    AND INDEX_NAME = 'idx_fraud_events_risk_created';

  IF v_index_exists = 0 THEN
    ALTER TABLE fraud_events
      ADD INDEX idx_fraud_events_risk_created (risk_level, created_at);
  END IF;
END $$

DELIMITER ;

CALL migrate_fraud_events_layer();
DROP PROCEDURE migrate_fraud_events_layer;
