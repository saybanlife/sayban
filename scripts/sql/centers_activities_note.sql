-- Per-center short description for each selected daily activity.
-- Used by Panel «برنامه روزانه و فعالیت‌ها» and the public center page.
-- Rollback: ALTER TABLE centers__activities DROP COLUMN note;

ALTER TABLE centers__activities
  ADD COLUMN note VARCHAR(255) NULL DEFAULT NULL AFTER activity_id;
