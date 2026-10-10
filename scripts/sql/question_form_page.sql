-- Per-category form pages for questionnaire questions.
-- Page numbers are independent within each category_id (Page 1 of A ≠ Page 1 of B).
-- Pair: scripts/sql/question_form_page_rollback.sql

ALTER TABLE `centers__question`
  ADD COLUMN IF NOT EXISTS `form_page` INT NOT NULL DEFAULT 1;

UPDATE `centers__question`
SET `form_page` = 1
WHERE `form_page` IS NULL OR `form_page` < 1;

ALTER TABLE `centers__question`
  ADD INDEX IF NOT EXISTS `idx_centers_question_category_page`
    (`category_id`, `form_page`, `sort_order`, `id`);
