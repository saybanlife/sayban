-- Sayban reminders (لیاد) — greenfield schema on sayban_db.
-- Timezone contract: all DATETIME values are Asia/Tehran wall-clock.
-- Safe to re-run: CREATE IF NOT EXISTS + INSERT IGNORE seeds.

CREATE TABLE IF NOT EXISTS reminders (
  id BIGINT(20) NOT NULL AUTO_INCREMENT,
  user_id BIGINT(20) NOT NULL,
  type VARCHAR(64) NOT NULL,
  schedule_type ENUM('every_day', 'every_year', 'once') NOT NULL,
  name VARCHAR(255) NOT NULL,
  text TEXT NULL,
  weekdays JSON NULL COMMENT 'JSON array of weekday names for every_day',
  dates JSON NULL COMMENT 'date strings, yearly may use year 0000',
  times JSON NOT NULL COMMENT 'JSON array of HH:MM times',
  pre_reminders JSON NULL COMMENT 'pre-reminder offsets from UI',
  channels JSON NOT NULL COMMENT 'notification sms bale',
  phone_number VARCHAR(20) NULL,
  bale_id VARCHAR(64) NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Tehran',
  starts_at DATETIME NULL,
  finish_at DATETIME NULL,
  status ENUM('active', 'paused', 'completed', 'cancelled', 'failed') NOT NULL DEFAULT 'active',
  next_materialize_at DATETIME NULL,
  version INT(11) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_reminders_user_status (user_id, status, deleted_at),
  KEY idx_reminders_materialize (status, next_materialize_at),
  KEY idx_reminders_finish (finish_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reminder_occurrences (
  id BIGINT(20) NOT NULL AUTO_INCREMENT,
  reminder_id BIGINT(20) NOT NULL,
  user_id BIGINT(20) NOT NULL,
  reminder_version INT(11) NOT NULL,
  fire_at DATETIME NOT NULL COMMENT 'Asia Tehran wall-clock',
  kind ENUM('main', 'pre') NOT NULL DEFAULT 'main',
  pre_offset_minutes INT(11) NULL,
  title VARCHAR(255) NULL,
  body TEXT NULL,
  channels JSON NOT NULL,
  status ENUM(
    'pending',
    'claimed',
    'processing',
    'sent',
    'partial',
    'failed',
    'cancelled',
    'skipped'
  ) NOT NULL DEFAULT 'pending',
  claimed_at DATETIME NULL,
  claimed_by VARCHAR(64) NULL,
  attempt_count INT(11) NOT NULL DEFAULT 0,
  next_retry_at DATETIME NULL,
  last_error TEXT NULL,
  sent_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_occurrence_slot (reminder_id, fire_at, kind, reminder_version),
  KEY idx_occ_dispatch (status, fire_at),
  KEY idx_occ_retry (status, next_retry_at),
  KEY idx_occ_user_fire (user_id, fire_at),
  KEY idx_occ_reminder_status (reminder_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reminder_deliveries (
  id BIGINT(20) NOT NULL AUTO_INCREMENT,
  occurrence_id BIGINT(20) NOT NULL,
  reminder_id BIGINT(20) NOT NULL,
  user_id BIGINT(20) NOT NULL,
  channel ENUM('notification', 'sms', 'bale') NOT NULL,
  status ENUM(
    'pending',
    'sending',
    'sent',
    'retry_wait',
    'dead',
    'skipped',
    'cancelled'
  ) NOT NULL DEFAULT 'pending',
  attempt_no INT(11) NOT NULL DEFAULT 0,
  max_attempts INT(11) NOT NULL DEFAULT 5,
  next_retry_at DATETIME NULL,
  unit_cost BIGINT(20) NOT NULL DEFAULT 0 COMMENT 'Toman snapshot at materialize time',
  wallet_tx_id BIGINT(20) NULL,
  provider_message_id VARCHAR(128) NULL,
  inbox_notification_id BIGINT(20) NULL,
  request_payload JSON NULL,
  response_payload JSON NULL,
  last_error_code VARCHAR(64) NULL,
  last_error TEXT NULL,
  sent_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_delivery_channel (occurrence_id, channel),
  KEY idx_delivery_retry (status, next_retry_at),
  KEY idx_delivery_reminder (reminder_id),
  KEY idx_delivery_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reminder_wallets (
  user_id BIGINT(20) NOT NULL,
  balance BIGINT(20) NOT NULL DEFAULT 0 COMMENT 'Toman balance non-negative via app logic',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reminder_wallet_transactions (
  id BIGINT(20) NOT NULL AUTO_INCREMENT,
  user_id BIGINT(20) NOT NULL,
  type ENUM('topup', 'reminder_charge', 'refund', 'adjust') NOT NULL,
  amount BIGINT(20) NOT NULL COMMENT 'positive credit negative debit',
  balance_after BIGINT(20) NOT NULL,
  occurrence_id BIGINT(20) NULL,
  delivery_id BIGINT(20) NULL,
  payment_id BIGINT(20) NULL,
  idempotency_key VARCHAR(64) NOT NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wallet_idempotency (idempotency_key),
  KEY idx_wallet_tx_user (user_id, created_at),
  KEY idx_wallet_tx_delivery (delivery_id),
  KEY idx_wallet_tx_payment (payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reminder_channel_prices (
  channel ENUM('notification', 'sms', 'bale') NOT NULL,
  unit_price BIGINT(20) NOT NULL DEFAULT 0 COMMENT 'Toman per send attempt',
  is_paid TINYINT(1) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (channel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reminder_categories (
  id BIGINT(20) NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  title_fa VARCHAR(255) NOT NULL,
  icon VARCHAR(128) NULL,
  is_addable TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT(11) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reminder_category_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reminder_templates (
  id BIGINT(20) NOT NULL AUTO_INCREMENT,
  category_code VARCHAR(64) NOT NULL,
  title_fa VARCHAR(255) NOT NULL,
  default_text TEXT NULL,
  schedule_type ENUM('every_day', 'every_year', 'once') NOT NULL DEFAULT 'every_year',
  template VARCHAR(50) NOT NULL DEFAULT '',
  default_times JSON NULL,
  kind ENUM('occasion', 'suggestion') NOT NULL DEFAULT 'suggestion',
  meta JSON NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT(11) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reminder_templates_cat (category_code, kind, active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO reminder_channel_prices (channel, unit_price, is_paid, active) VALUES
  ('notification', 0, 0, 1),
  ('sms', 500, 1, 1),
  ('bale', 200, 1, 1);

INSERT IGNORE INTO reminder_categories (code, title_fa, icon, is_addable, sort_order, active) VALUES
  ('medicine_time', 'زمان دارو', 'medicine', 1, 10, 1),
  ('appointment', 'نوبت پزشکی', 'calendar', 1, 20, 1),
  ('occasion', 'مناسبت', 'gift', 1, 30, 1);

INSERT IGNORE INTO reminder_templates (
  category_code, title_fa, default_text, schedule_type, template, default_times, kind, sort_order, active
) VALUES
  ('medicine_time', 'مصرف دارو', 'زمان مصرف دارو فرا رسیده است.', 'every_day', 'medicine_time', '["09:30"]', 'suggestion', 10, 1),
  ('occasion', 'روز زن', 'روز زن مبارک!', 'every_year', 'occasion', '["09:00"]', 'occasion', 10, 1),
  ('occasion', 'روز مادر', 'روز مادر مبارک!', 'every_year', 'occasion', '["09:00"]', 'occasion', 20, 1);
