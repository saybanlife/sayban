-- Marks which of a user's saved addresses is the currently selected one.
-- Consumed by the n8n `address/current` webhooks (GET reads it, POST moves it).
-- Applied to sayban_db on 2026-08-27.

ALTER TABLE `users__addresses`
  ADD COLUMN `is_current` TINYINT(1) NOT NULL DEFAULT 0;

-- At most one current address per user is enforced by the setter webhook, which
-- clears the user's rows before marking the new one.
CREATE INDEX `idx_users_addresses_user_current`
  ON `users__addresses` (`user_id`, `is_current`);

-- Rollback:
-- DROP INDEX `idx_users_addresses_user_current` ON `users__addresses`;
-- ALTER TABLE `users__addresses` DROP COLUMN `is_current`;
