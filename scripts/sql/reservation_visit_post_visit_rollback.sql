-- Rollback reservation_visit_post_visit.sql (drops additive columns only).

SET @db := DATABASE();

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db
       AND TABLE_NAME = 'reservations__lifecycle'
       AND COLUMN_NAME = 'visit_post_visit_meta') > 0,
  'ALTER TABLE reservations__lifecycle DROP COLUMN visit_post_visit_meta',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db
       AND TABLE_NAME = 'centers__reviews'
       AND COLUMN_NAME = 'reservation_id') > 0,
  'ALTER TABLE centers__reviews DROP COLUMN reservation_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db
       AND TABLE_NAME = 'centers__reviews'
       AND COLUMN_NAME = 'private_comment') > 0,
  'ALTER TABLE centers__reviews DROP COLUMN private_comment',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
