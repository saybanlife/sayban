-- Rollback for scripts/sql/visit_reservation_service.sql

ALTER TABLE `reservations`
  DROP CONSTRAINT `chk_reservations_start_time`,
  DROP CONSTRAINT `chk_reservations_end_time`;

-- Only safe while no reservation references the visit service.
DELETE FROM `centers__services` WHERE `code` = 'VISIT' AND `center_id` IS NULL;

ALTER TABLE `centers__services`
  DROP INDEX `uq_centers_services_code`,
  DROP COLUMN `code`;
