-- Rollback for users_isnotif.sql. This removes stored preference values.
ALTER TABLE users
  DROP COLUMN isnotif;
