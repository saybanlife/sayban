-- Conditional question visibility: show Z when question X answer equals option Y.
-- Idempotent where supported. Pair: scripts/sql/question_show_if_rollback.sql
--
-- Apply (phpMyAdmin / pma-sql), one statement at a time if needed:
--   ALTER TABLE centers__question ADD COLUMN show_if_question_id BIGINT UNSIGNED NULL;
--   ALTER TABLE centers__question ADD COLUMN show_if_option VARCHAR(255) NULL;
--   ALTER TABLE centers__question ADD INDEX idx_centers_question_show_if (show_if_question_id);

ALTER TABLE `centers__question`
  ADD COLUMN `show_if_question_id` BIGINT UNSIGNED NULL;

ALTER TABLE `centers__question`
  ADD COLUMN `show_if_option` VARCHAR(255) NULL;

ALTER TABLE `centers__question`
  ADD INDEX `idx_centers_question_show_if` (`show_if_question_id`);
