-- Rollback for staff_no_criminal_record.sql

ALTER TABLE centers__staffs
  DROP COLUMN no_criminal_record;
