-- MySQL 8.0+ migration: payment reconciliation findings store
-- Safe to re-run in production.

DELIMITER $$

DROP PROCEDURE IF EXISTS migrate_payment_reconciliation_layer $$
CREATE PROCEDURE migrate_payment_reconciliation_layer()
BEGIN
  DECLARE v_table_exists INT DEFAULT 0;
  DECLARE v_index_exists INT DEFAULT 0;

  SELECT COUNT(*) INTO v_table_exists
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payment_reconciliation_reports';

  IF v_table_exists = 0 THEN
    CREATE TABLE payment_reconciliation_reports (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      run_id CHAR(36) NOT NULL,
      booking_id BIGINT UNSIGNED NULL,
      payment_id BIGINT UNSIGNED NULL,
      stripe_payment_intent VARCHAR(120) NULL,
      anomaly_type VARCHAR(64) NOT NULL,
      severity ENUM('low', 'high', 'critical') NOT NULL,
      details_json JSON NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB;
  END IF;

  SELECT COUNT(*) INTO v_index_exists
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payment_reconciliation_reports'
    AND INDEX_NAME = 'idx_recon_reports_run_id';

  IF v_index_exists = 0 THEN
    ALTER TABLE payment_reconciliation_reports
      ADD INDEX idx_recon_reports_run_id (run_id);
  END IF;

  SELECT COUNT(*) INTO v_index_exists
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payment_reconciliation_reports'
    AND INDEX_NAME = 'idx_recon_reports_anomaly_type';

  IF v_index_exists = 0 THEN
    ALTER TABLE payment_reconciliation_reports
      ADD INDEX idx_recon_reports_anomaly_type (anomaly_type);
  END IF;

  SELECT COUNT(*) INTO v_index_exists
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payment_reconciliation_reports'
    AND INDEX_NAME = 'idx_recon_reports_severity_created';

  IF v_index_exists = 0 THEN
    ALTER TABLE payment_reconciliation_reports
      ADD INDEX idx_recon_reports_severity_created (severity, created_at);
  END IF;

  SELECT COUNT(*) INTO v_index_exists
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payment_reconciliation_reports'
    AND INDEX_NAME = 'uq_recon_reports_run_finding';

  IF v_index_exists = 0 THEN
    ALTER TABLE payment_reconciliation_reports
      ADD UNIQUE KEY uq_recon_reports_run_finding (
        run_id,
        anomaly_type,
        booking_id,
        payment_id,
        stripe_payment_intent
      );
  END IF;
END $$

DELIMITER ;

CALL migrate_payment_reconciliation_layer();
DROP PROCEDURE migrate_payment_reconciliation_layer;
