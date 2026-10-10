-- Reminder companion + image support (idempotent).
-- Rollback: scripts/sql/reminders_companion_image_rollback.sql

ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS patient_id BIGINT(20) NULL COMMENT 'users__patient.id companion' AFTER user_id;

ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(512) NULL COMMENT 'CDN image URL' AFTER text;

-- Index for filtering by companion (ignore if already exists).
SET @idx := (
  SELECT COUNT(1) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'reminders'
    AND index_name = 'idx_reminders_patient'
);
SET @sql := IF(
  @idx = 0,
  'ALTER TABLE reminders ADD KEY idx_reminders_patient (user_id, patient_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
