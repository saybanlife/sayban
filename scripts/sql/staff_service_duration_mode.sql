-- Additive: once vs continuous for nurse/caregiver catalog services.
-- Rollback: staff_service_duration_mode_rollback.sql

SET @db := DATABASE();

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db
       AND TABLE_NAME = 'centers__services'
       AND COLUMN_NAME = 'duration_mode') = 0,
  'ALTER TABLE centers__services ADD COLUMN duration_mode ENUM(''once'',''continuous'') NULL DEFAULT NULL AFTER category',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
