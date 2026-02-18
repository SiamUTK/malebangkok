CREATE DATABASE IF NOT EXISTS malebangkok CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE malebangkok;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(25) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('client', 'guide', 'admin') NOT NULL DEFAULT 'client',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_is_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS guides (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  bio TEXT NOT NULL,
  specialties VARCHAR(255) NULL,
  base_price DECIMAL(10,2) NOT NULL,
  age TINYINT UNSIGNED NULL,
  city VARCHAR(100) NOT NULL DEFAULT 'Bangkok',
  verification_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  avg_rating DECIMAL(3,2) NOT NULL DEFAULT 0,
  total_reviews INT UNSIGNED NOT NULL DEFAULT 0,
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_guides_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  UNIQUE KEY uq_guides_user_id (user_id),
  KEY idx_guides_active (is_active),
  KEY idx_guides_price (base_price),
  KEY idx_guides_verification_status (verification_status),
  KEY idx_guides_city (city),
  KEY idx_guides_availability (is_available)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  guide_id BIGINT UNSIGNED NOT NULL,
  payment_intent_id VARCHAR(120) NULL,
  booking_date DATETIME NOT NULL,
  duration_hours DECIMAL(4,2) NOT NULL,
  booking_end_date DATETIME GENERATED ALWAYS AS (DATE_ADD(booking_date, INTERVAL ROUND(duration_hours * 60) MINUTE)) STORED,
  total_price DECIMAL(10,2) NOT NULL,
  base_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  peak_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  weekend_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  premium_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  premium_options JSON NULL,
  status ENUM('pending', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  payment_status ENUM('unpaid', 'requires_payment', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'unpaid',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_bookings_guide
    FOREIGN KEY (guide_id)
    REFERENCES guides(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT chk_bookings_duration CHECK (duration_hours > 0 AND duration_hours <= 24),
  CONSTRAINT chk_bookings_total_price CHECK (total_price >= 0),
  UNIQUE KEY uq_bookings_payment_intent (payment_intent_id),
  KEY idx_bookings_user_id (user_id),
  KEY idx_bookings_guide_id (guide_id),
  KEY idx_bookings_status (status),
  KEY idx_bookings_date (booking_date),
  KEY idx_bookings_end_date (booking_end_date),
  KEY idx_bookings_payment_status (payment_status),
  KEY idx_bookings_guide_status_date (guide_id, status, booking_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  guide_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'thb',
  stripe_payment_intent_id VARCHAR(120) NOT NULL,
  stripe_charge_id VARCHAR(120) NULL,
  status ENUM('pending', 'requires_action', 'succeeded', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  provider_payload JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_booking
    FOREIGN KEY (booking_id)
    REFERENCES bookings(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_payments_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_payments_guide
    FOREIGN KEY (guide_id)
    REFERENCES guides(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT chk_payments_amount CHECK (amount >= 0),
  UNIQUE KEY uq_payments_stripe_pi (stripe_payment_intent_id),
  KEY idx_payments_booking_id (booking_id),
  KEY idx_payments_status (status),
  KEY idx_payments_created_at (created_at),
  KEY idx_payments_user_guide (user_id, guide_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  guide_id BIGINT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT NULL,
  status ENUM('pending', 'published', 'hidden') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_booking
    FOREIGN KEY (booking_id)
    REFERENCES bookings(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_reviews_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_reviews_guide
    FOREIGN KEY (guide_id)
    REFERENCES guides(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
  UNIQUE KEY uq_reviews_booking (booking_id),
  KEY idx_reviews_guide_id (guide_id),
  KEY idx_reviews_status (status),
  KEY idx_reviews_rating (rating)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS commissions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  guide_id BIGINT UNSIGNED NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL,
  platform_rate DECIMAL(5,4) NOT NULL,
  platform_amount DECIMAL(10,2) NOT NULL,
  guide_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'settled', 'reversed') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_commissions_booking
    FOREIGN KEY (booking_id)
    REFERENCES bookings(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_commissions_guide
    FOREIGN KEY (guide_id)
    REFERENCES guides(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT chk_commissions_amounts CHECK (
    gross_amount >= 0
    AND platform_amount >= 0
    AND guide_amount >= 0
    AND platform_amount + guide_amount = gross_amount
  ),
  CONSTRAINT chk_commissions_rate CHECK (platform_rate >= 0 AND platform_rate <= 1),
  UNIQUE KEY uq_commissions_booking (booking_id),
  KEY idx_commissions_guide_id (guide_id),
  KEY idx_commissions_status (status),
  KEY idx_commissions_created_at (created_at)
) ENGINE=InnoDB;
