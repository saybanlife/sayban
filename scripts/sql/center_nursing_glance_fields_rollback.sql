-- Rollback for center_nursing_glance_fields.sql
-- Safe to run when columns exist; ignore errors if already dropped.

ALTER TABLE centers DROP COLUMN dispatch_workforce_types;
ALTER TABLE centers DROP COLUMN license_type;
