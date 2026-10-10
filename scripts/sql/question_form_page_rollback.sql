-- Rollback for scripts/sql/question_form_page.sql

ALTER TABLE `centers__question`
  DROP INDEX IF EXISTS `idx_centers_question_category_page`;

ALTER TABLE `centers__question`
  DROP COLUMN IF EXISTS `form_page`;
