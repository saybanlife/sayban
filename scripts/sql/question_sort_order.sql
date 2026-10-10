-- Question display order for reservation forms.
-- Pair: scripts/sql/question_sort_order_rollback.sql

ALTER TABLE `centers__question`
  ADD COLUMN `sort_order` INT NOT NULL DEFAULT 0;

UPDATE `centers__question`
SET `sort_order` = `id`
WHERE `sort_order` = 0;

ALTER TABLE `centers__question`
  ADD INDEX `idx_centers_question_sort` (`sort_order`, `id`);
