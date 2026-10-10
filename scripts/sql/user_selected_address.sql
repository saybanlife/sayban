-- Selected / current address for public users
-- Safe to re-run (checks information_schema before ALTER).

SET @db := DATABASE();

-- address.is_current
SET @has_is_current := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'address' AND COLUMN_NAME = 'is_current'
);
SET @sql := IF(
  @has_is_current = 0,
  'ALTER TABLE `address` ADD COLUMN `is_current` TINYINT(1) NOT NULL DEFAULT 0 AFTER `city`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- helpful index for "current address of user"
SET @has_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'address' AND INDEX_NAME = 'idx_address_user_current'
);
SET @sql := IF(
  @has_idx = 0,
  'ALTER TABLE `address` ADD INDEX `idx_address_user_current` (`user_id`, `is_current`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
