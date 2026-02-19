-- MySQL 8.0+ safe migration for PaymentIntent idempotency hardening
-- ------------------------------------------------------------------
-- Why this migration exists:
-- 1) Enforce one Stripe PaymentIntent reference per payment row set (duplicate-charge guardrail).
-- 2) Speed up idempotent lookup by booking and status.
-- 3) Keep query plans stable for payment timelines.
--
-- Safety properties:
-- - Uses metadata checks before ALTER TABLE.
-- - Never drops columns/tables/data.
-- - Skips unique-key creation when duplicates exist (with warning row).
-- - Compatible with environments using either stripe_payment_intent_id or stripe_payment_intent.

DELIMITER $$

DROP PROCEDURE IF EXISTS migrate_payment_intent_creation_idempotency $$
CREATE PROCEDURE migrate_payment_intent_creation_idempotency()
BEGIN
  DECLARE v_payments_exists INT DEFAULT 0;
  DECLARE v_has_pi_id_col INT DEFAULT 0;
  DECLARE v_has_pi_col INT DEFAULT 0;
  DECLARE v_idx_exists INT DEFAULT 0;
  DECLARE v_dup_count BIGINT DEFAULT 0;

  -- Confirm target table exists in the current schema.
  SELECT COUNT(*) INTO v_payments_exists
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payments';

  IF v_payments_exists = 1 THEN
    -- Detect column naming variation across environments.
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

    -- (1) Enforce unique PaymentIntent reference (database-backed idempotency).
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
        SELECT 'WARNING: duplicate stripe_payment_intent_id values detected. Unique key was not added.' AS warning;
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
        SELECT 'WARNING: duplicate stripe_payment_intent values detected. Unique key was not added.' AS warning;
      END IF;
    END IF;

    -- (2) Required performance index for idempotent lookup workflow.
    SELECT COUNT(*) INTO v_idx_exists
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'payments'
      AND INDEX_NAME = 'idx_payments_booking_status';

    IF v_idx_exists = 0 THEN
      ALTER TABLE payments
        ADD INDEX idx_payments_booking_status (booking_id, status);
    END IF;

    -- (3) Optional helper index for timeline/cleanup/read patterns.
    SELECT COUNT(*) INTO v_idx_exists
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'payments'
      AND INDEX_NAME = 'idx_payments_created_at';

    IF v_idx_exists = 0 THEN
      ALTER TABLE payments
        ADD INDEX idx_payments_created_at (created_at);
    END IF;
  END IF;
END $$

DELIMITER ;

CALL migrate_payment_intent_creation_idempotency();
DROP PROCEDURE migrate_payment_intent_creation_idempotency;
