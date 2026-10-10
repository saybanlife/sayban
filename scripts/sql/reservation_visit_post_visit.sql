-- Post–visit contract feedback + optional review linkage (additive, idempotent).
-- Adds reservations__lifecycle.visit_post_visit_meta (JSON NULL; MariaDB stores JSON as LONGTEXT).
-- Rollback: reservation_visit_post_visit_rollback.sql
--
-- Apply (phpMyAdmin helper — do not run until you intend to mutate that DB):
--   node .cursor/sayban-ops/pma-sql.js "$(Get-Content -Raw scripts/sql/reservation_visit_post_visit.sql)"
-- Or paste the file into phpMyAdmin SQL for sayban_db.

SET @db := DATABASE();

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db
       AND TABLE_NAME = 'reservations__lifecycle'
       AND COLUMN_NAME = 'visit_post_visit_meta') = 0,
  'ALTER TABLE reservations__lifecycle ADD COLUMN visit_post_visit_meta JSON NULL AFTER cancellation_policy',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db
       AND TABLE_NAME = 'centers__reviews'
       AND COLUMN_NAME = 'private_comment') = 0,
  'ALTER TABLE centers__reviews ADD COLUMN private_comment text NULL AFTER comment',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = @db
       AND TABLE_NAME = 'centers__reviews'
       AND COLUMN_NAME = 'reservation_id') = 0,
  'ALTER TABLE centers__reviews ADD COLUMN reservation_id int(11) NULL AFTER private_comment',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
