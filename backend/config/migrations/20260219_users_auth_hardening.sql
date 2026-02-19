-- MySQL 8+ safe migration for production auth hardening
-- Run in phpMyAdmin with the target database selected

DELIMITER $$

DROP PROCEDURE IF EXISTS migrate_users_auth_hardening $$
CREATE PROCEDURE migrate_users_auth_hardening()
BEGIN
  DECLARE v_exists INT DEFAULT 0;
  DECLARE v_unique_exists INT DEFAULT 0;

  SELECT COUNT(*) INTO v_exists
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users';

  IF v_exists = 0 THEN
    CREATE TABLE users (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(150) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('user','guide','admin') NOT NULL DEFAULT 'user',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_users_email (email)
    ) ENGINE=InnoDB;
  ELSE
    CREATE TABLE IF NOT EXISTS users_backup_before_auth_hardening AS
    SELECT * FROM users;

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email VARCHAR(150) NULL,
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NULL,
      ADD COLUMN IF NOT EXISTS role ENUM('user','guide','admin') NULL,
      ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NULL,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL;

    UPDATE users
    SET role = 'user'
    WHERE role IS NULL OR role = '' OR role = 'client';

    UPDATE users
    SET is_active = 1
    WHERE is_active IS NULL;

    UPDATE users
    SET created_at = CURRENT_TIMESTAMP
    WHERE created_at IS NULL;

    UPDATE users
    SET updated_at = created_at
    WHERE updated_at IS NULL;

    ALTER TABLE users
      MODIFY COLUMN email VARCHAR(150) NOT NULL,
      MODIFY COLUMN password_hash VARCHAR(255) NOT NULL,
      MODIFY COLUMN role ENUM('user','guide','admin') NOT NULL DEFAULT 'user',
      MODIFY COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1,
      MODIFY COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      MODIFY COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

    SELECT COUNT(*) INTO v_unique_exists
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND INDEX_NAME = 'uq_users_email';

    IF v_unique_exists = 0 THEN
      ALTER TABLE users ADD UNIQUE KEY uq_users_email (email);
    END IF;
  END IF;
END $$

DELIMITER ;

CALL migrate_users_auth_hardening();
DROP PROCEDURE migrate_users_auth_hardening;
