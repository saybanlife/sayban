-- Rollback companion + image columns on reminders.

ALTER TABLE reminders DROP INDEX IF EXISTS idx_reminders_patient;
ALTER TABLE reminders DROP COLUMN IF EXISTS patient_id;
ALTER TABLE reminders DROP COLUMN IF EXISTS image_url;
