-- Rollback staff_service_duration_mode.sql

SET @db := DATABASE();

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db
       AND TABLE_NAME = 'centers__services'
       AND COLUMN_NAME = 'duration_mode') > 0,
  'ALTER TABLE centers__services DROP COLUMN duration_mode',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
