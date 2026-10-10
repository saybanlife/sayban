-- Rollback for center_nursing_overview_fields.sql
-- Safe to run when columns exist; ignore errors if already dropped.

ALTER TABLE centers DROP COLUMN active_staff_count;
ALTER TABLE centers DROP COLUMN min_work_experience_value;
ALTER TABLE centers DROP COLUMN min_work_experience_unit;
ALTER TABLE centers DROP COLUMN dispatch_tehran_districts;
ALTER TABLE centers DROP COLUMN dispatch_lead_time;
ALTER TABLE centers DROP COLUMN urgent_dispatch;
ALTER TABLE centers DROP COLUMN activity_days;
ALTER TABLE centers DROP COLUMN response_hours_start;
ALTER TABLE centers DROP COLUMN response_hours_end;
