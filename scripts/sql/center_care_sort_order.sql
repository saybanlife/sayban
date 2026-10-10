-- Per-center display order for care & treatment options.
-- Idempotent. Applied for panel DnD + public Center page sort.
--
--   node .cursor/sayban-ops/pma-sql.js "$(Get-Content -Raw scripts/sql/center_care_sort_order.sql)"
-- Rollback: scripts/sql/center_care_sort_order_rollback.sql

-- 1. Per-center order for facility checklist rows.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'centers__care_item_values'
    AND COLUMN_NAME = 'sort_order'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `centers__care_item_values` ADD COLUMN `sort_order` INT NOT NULL DEFAULT 0 AFTER `note`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Seed from library order where still 0.
UPDATE `centers__care_item_values` v
INNER JOIN `centers__care_items` ci ON ci.id = v.care_item_id
SET v.sort_order = COALESCE(ci.sort_order, 0)
WHERE v.sort_order = 0;

-- 2. Per-center order for specialist / doctor rows.
SET @col_exists2 := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'centers__specialists'
    AND COLUMN_NAME = 'sort_order'
);
SET @sql2 := IF(
  @col_exists2 = 0,
  'ALTER TABLE `centers__specialists` ADD COLUMN `sort_order` INT NOT NULL DEFAULT 0 AFTER `is_active`',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Seed specialists from id so existing rows keep a stable relative order.
UPDATE `centers__specialists`
SET `sort_order` = `id`
WHERE `sort_order` = 0;
