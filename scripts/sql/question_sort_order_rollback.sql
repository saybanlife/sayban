ALTER TABLE `centers__question`
  DROP INDEX IF EXISTS `idx_centers_question_sort`;

ALTER TABLE `centers__question`
  DROP COLUMN IF EXISTS `sort_order`;
