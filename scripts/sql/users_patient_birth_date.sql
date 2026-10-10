-- Optional birth date for companion / elderly profiles (افزودن سالمند).
-- Additive + nullable; existing rows stay valid.
--
-- Apply:
--   node .cursor/sayban-ops/pma-sql.js "ALTER TABLE users__patient ADD COLUMN birth_date DATE NULL AFTER relation;"
--
-- Rollback: scripts/sql/users_patient_birth_date_rollback.sql

ALTER TABLE `users__patient`
  ADD COLUMN IF NOT EXISTS `birth_date` DATE NULL AFTER `relation`;
