-- Visit booking («رزرو وقت بازدید») — one center-independent service + datetime guards.
--
-- Why:
--  * Every center used to book "a visit" against one of its own clinical services
--    (the client fell back to `services[0]`), so visits were stored as e.g.
--    «فیزیوتراپی» with that service's price.
--  * `reservations.start_time` accepted garbage ("undefined 08:00") because the
--    server interpolated the client string straight into the INSERT and MariaDB
--    runs in non-strict mode, coercing it to '0000-00-00 00:00:00'.
--
-- Rollback: scripts/sql/visit_reservation_service_rollback.sql

-- Re-runnable: uses MariaDB's IF [NOT] EXISTS extensions throughout.

-- 1) Stable, human-readable service codes.
ALTER TABLE `centers__services`
  ADD COLUMN IF NOT EXISTS `code` VARCHAR(32) NULL DEFAULT NULL AFTER `center_id`,
  ADD UNIQUE KEY IF NOT EXISTS `uq_centers_services_code` (`code`);

-- 2) The single visit service. `center_id IS NULL` == belongs to no center;
--    every center books visits against this one row.
INSERT IGNORE INTO `centers__services`
  (`center_id`, `code`, `name`, `category`, `description`,
   `duration_minutes`, `buffer_minutes`, `is_active`, `service_location`)
VALUES
  (NULL, 'VISIT', 'رزرو وقت بازدید', 'general',
   'رزرو روز و ساعت بازدید حضوری از مرکز', 30, 0, 1, 'center');

-- 3) Make an invalid datetime a hard error instead of a silent zero date.
--    Rows that legitimately have no appointment time (home-care requests) keep NULL.
ALTER TABLE `reservations`
  DROP CONSTRAINT IF EXISTS `chk_reservations_start_time`,
  DROP CONSTRAINT IF EXISTS `chk_reservations_end_time`;

ALTER TABLE `reservations`
  ADD CONSTRAINT `chk_reservations_start_time`
    CHECK (`start_time` IS NULL OR `start_time` >= '2000-01-01 00:00:00'),
  ADD CONSTRAINT `chk_reservations_end_time`
    CHECK (`end_time` IS NULL OR `end_time` >= '2000-01-01 00:00:00');
