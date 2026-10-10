-- CenterAdmin review replies on centers__reviews
-- Run once on sayban_db (skip any column that already exists).

ALTER TABLE centers__reviews
  ADD COLUMN admin_reply TEXT NULL AFTER comment;

ALTER TABLE centers__reviews
  ADD COLUMN admin_replied_at DATETIME NULL AFTER admin_reply;

ALTER TABLE centers__reviews
  ADD COLUMN admin_replied_by INT NULL AFTER admin_replied_at;
