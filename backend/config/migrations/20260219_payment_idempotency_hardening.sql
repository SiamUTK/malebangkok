-- MySQL 8.0+ safe migration for payment idempotency and transactional hardening
-- Purpose:
-- 1) Enforce unique Stripe payment intent in payments table
-- 2) Ensure status indexes for payments and bookings
-- 3) Guard booking status transitions at DB layer

DELIMITER $$

DROP PROCEDURE IF EXISTS migrate_payment_idempotency_hardening $$
CREATE PROCEDURE migrate_payment_idempotency_hardening()
BEGIN
  DECLARE v_payments_exists INT DEFAULT 0;
  DECLARE v_bookings_exists INT DEFAULT 0;
  DECLARE v_has_pi_id_col INT DEFAULT 0;
  DECLARE v_has_pi_col INT DEFAULT 0;
  DECLARE v_dup_count BIGINT DEFAULT 0;
  DECLARE v_idx_exists INT DEFAULT 0;
  DECLARE v_trigger_exists INT DEFAULT 0;

  SELECT COUNT(*) INTO v_payments_exists
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments';

  SELECT COUNT(*) INTO v_bookings_exists
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings';

  IF v_payments_exists = 1 THEN
    SELECT COUNT(*) INTO v_has_pi_id_col
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'payments'
      AND COLUMN_NAME = 'stripe_payment_intent_id';

    SELECT COUNT(*) INTO v_has_pi_col
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'payments'
      AND COLUMN_NAME = 'stripe_payment_intent';

    IF v_has_pi_id_col = 1 THEN
      SELECT COUNT(*) INTO v_dup_count
      FROM (
        SELECT stripe_payment_intent_id
        FROM payments
        WHERE stripe_payment_intent_id IS NOT NULL
          AND stripe_payment_intent_id <> ''
        GROUP BY stripe_payment_intent_id
        HAVING COUNT(*) > 1
      ) AS dup;

      SELECT COUNT(*) INTO v_idx_exists
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'payments'
        AND INDEX_NAME = 'uq_payments_stripe_payment_intent_id';

      IF v_dup_count = 0 AND v_idx_exists = 0 THEN
        ALTER TABLE payments
          ADD UNIQUE KEY uq_payments_stripe_payment_intent_id (stripe_payment_intent_id);
      END IF;

      IF v_dup_count > 0 THEN
        SELECT 'Skipped unique index on payments.stripe_payment_intent_id due to duplicates. Resolve duplicates before re-running migration.' AS warning;
      END IF;
    ELSEIF v_has_pi_col = 1 THEN
      SELECT COUNT(*) INTO v_dup_count
      FROM (
        SELECT stripe_payment_intent
        FROM payments
        WHERE stripe_payment_intent IS NOT NULL
          AND stripe_payment_intent <> ''
        GROUP BY stripe_payment_intent
        HAVING COUNT(*) > 1
      ) AS dup;

      SELECT COUNT(*) INTO v_idx_exists
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'payments'
        AND INDEX_NAME = 'uq_payments_stripe_payment_intent';

      IF v_dup_count = 0 AND v_idx_exists = 0 THEN
        ALTER TABLE payments
          ADD UNIQUE KEY uq_payments_stripe_payment_intent (stripe_payment_intent);
      END IF;

      IF v_dup_count > 0 THEN
        SELECT 'Skipped unique index on payments.stripe_payment_intent due to duplicates. Resolve duplicates before re-running migration.' AS warning;
      END IF;
    END IF;

    SELECT COUNT(*) INTO v_idx_exists
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'payments'
      AND INDEX_NAME = 'idx_payments_status';

    IF v_idx_exists = 0 THEN
      ALTER TABLE payments ADD INDEX idx_payments_status (status);
    END IF;
  END IF;

  IF v_bookings_exists = 1 THEN
    SELECT COUNT(*) INTO v_idx_exists
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      AND INDEX_NAME = 'idx_bookings_status';

    IF v_idx_exists = 0 THEN
      ALTER TABLE bookings ADD INDEX idx_bookings_status (status);
    END IF;

    SELECT COUNT(*) INTO v_trigger_exists
    FROM information_schema.TRIGGERS
    WHERE TRIGGER_SCHEMA = DATABASE()
      AND TRIGGER_NAME = 'trg_bookings_status_transition_guard';

    IF v_trigger_exists = 0 THEN
      SET @create_trigger_sql = '
        CREATE TRIGGER trg_bookings_status_transition_guard
        BEFORE UPDATE ON bookings
        FOR EACH ROW
        BEGIN
          IF NEW.status <> OLD.status THEN
            IF NOT (
              (OLD.status = ''pending'' AND NEW.status IN (''confirmed'', ''cancelled''))
              OR (OLD.status = ''confirmed'' AND NEW.status IN (''completed'', ''cancelled''))
              OR (OLD.status = ''completed'' AND NEW.status = ''completed'')
              OR (OLD.status = ''cancelled'' AND NEW.status = ''cancelled'')
            ) THEN
              SIGNAL SQLSTATE ''45000''
                SET MESSAGE_TEXT = ''Invalid booking status transition'';
            END IF;
          END IF;
        END
      ';

      PREPARE stmt FROM @create_trigger_sql;
      EXECUTE stmt;
      DEALLOCATE PREPARE stmt;
    END IF;
  END IF;
END $$

DELIMITER ;

CALL migrate_payment_idempotency_hardening();
DROP PROCEDURE migrate_payment_idempotency_hardening;
