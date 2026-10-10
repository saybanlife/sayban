-- Rollback for scripts/sql/companion_as_user.sql
-- Does NOT delete companion user rows created by migrate-companions-to-users.mjs;
-- remove those manually if needed (WHERE parent_user_id IS NOT NULL AND can_login = 0).

ALTER TABLE `reservations`
  DROP INDEX IF EXISTS `idx_reservations_for_user`;

ALTER TABLE `reservations`
  DROP COLUMN IF EXISTS `for_user_id`;

ALTER TABLE `users__patient`
  DROP INDEX IF EXISTS `uq_users_patient_linked_user`;

ALTER TABLE `users__patient`
  DROP COLUMN IF EXISTS `linked_user_id`;

ALTER TABLE `users`
  DROP INDEX IF EXISTS `idx_users_parent_user`;

ALTER TABLE `users`
  DROP INDEX IF EXISTS `idx_users_national_code`;

ALTER TABLE `users`
  DROP COLUMN IF EXISTS `can_login`,
  DROP COLUMN IF EXISTS `relation`,
  DROP COLUMN IF EXISTS `parent_user_id`;

-- Restore previous unique national_code if safe (may fail if duplicates exist).
-- ALTER TABLE `users` ADD UNIQUE INDEX `national_code` (`national_code`);
-- ALTER TABLE `users` MODIFY COLUMN `mobile` VARCHAR(12) NOT NULL;
