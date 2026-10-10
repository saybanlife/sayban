-- Rollback for center_care_sort_order.sql
-- Safe if columns already missing.

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'centers__care_item_values'
    AND COLUMN_NAME = 'sort_order'
);
SET @sql := IF(
  @col_exists > 0,
  'ALTER TABLE `centers__care_item_values` DROP COLUMN `sort_order`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists2 := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'centers__specialists'
    AND COLUMN_NAME = 'sort_order'
);
SET @sql2 := IF(
  @col_exists2 > 0,
  'ALTER TABLE `centers__specialists` DROP COLUMN `sort_order`',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
