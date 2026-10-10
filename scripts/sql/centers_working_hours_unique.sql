-- Fix centers__working_hours upsert: remove duplicate day rows, add unique key.
-- Root cause: INSERT ... ON DUPLICATE KEY UPDATE never fired (no unique key),
-- so every save appended rows and SELECTs returned the oldest values.
--
-- Run via: node scripts/run-sql-file.mjs scripts/sql/centers_working_hours_unique.sql
-- Note: phpMyAdmin helper runs statements in separate sessions — do not rely on
-- user variables spanning statements. Apply dedupe first, then ADD UNIQUE.

DELETE FROM `centers__working_hours`
WHERE `center_id` IS NULL OR `center_id` = 0;

DELETE t1
FROM `centers__working_hours` t1
INNER JOIN `centers__working_hours` t2
  ON t1.`center_id` = t2.`center_id`
 AND t1.`day_of_week` = t2.`day_of_week`
 AND t1.`id` < t2.`id`;

ALTER TABLE `centers__working_hours`
  ADD UNIQUE KEY `uq_center_day` (`center_id`, `day_of_week`);
