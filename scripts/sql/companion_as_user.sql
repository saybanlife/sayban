-- Companions as linked users (backward-compatible).
-- Keeps users__patient + reservations.patient_id; adds parent_user_id / for_user_id.
-- Pair: scripts/sql/companion_as_user_rollback.sql
-- Data backfill: node scripts/migrate-companions-to-users.mjs [--apply]

-- Primary account: parent_user_id IS NULL, can_login = 1
-- Companion: parent_user_id = owner users.id, can_login = 0

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `parent_user_id` INT NULL COMMENT 'Owner account when this row is a companion' AFTER `id`,
  ADD COLUMN IF NOT EXISTS `relation` VARCHAR(50) NULL COMMENT 'Relation to parent_user_id' AFTER `marital_status`,
  ADD COLUMN IF NOT EXISTS `can_login` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0 = companion/non-login user' AFTER `active`;

ALTER TABLE `users`
  MODIFY COLUMN `mobile` VARCHAR(12) NULL;

-- Companions may share/duplicate national codes; uniqueness enforced in app for login users only.
ALTER TABLE `users`
  DROP INDEX IF EXISTS `national_code`;

ALTER TABLE `users`
  ADD INDEX IF NOT EXISTS `idx_users_national_code` (`national_code`);

ALTER TABLE `users`
  ADD INDEX IF NOT EXISTS `idx_users_parent_user` (`parent_user_id`);

ALTER TABLE `users__patient`
  ADD COLUMN IF NOT EXISTS `linked_user_id` INT NULL COMMENT 'users.id created for this companion' AFTER `user_id`;

ALTER TABLE `users__patient`
  ADD UNIQUE INDEX IF NOT EXISTS `uq_users_patient_linked_user` (`linked_user_id`);

ALTER TABLE `reservations`
  ADD COLUMN IF NOT EXISTS `for_user_id` INT NULL COMMENT 'User the service is for (booker may differ)' AFTER `patient_id`;

ALTER TABLE `reservations`
  ADD INDEX IF NOT EXISTS `idx_reservations_for_user` (`for_user_id`);
