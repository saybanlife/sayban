-- Rollback for centers_working_hours_unique.sql
-- Keeps data; only drops the unique key (duplicates can return if upserts misbehave).

ALTER TABLE `centers__working_hours`
  DROP INDEX `uq_center_day`;
