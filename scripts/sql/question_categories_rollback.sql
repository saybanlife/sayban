UPDATE `centers__question` SET `category_id` = NULL WHERE `category_id` IS NOT NULL;

ALTER TABLE `centers__question`
  DROP INDEX IF EXISTS `idx_centers_question_category`;

ALTER TABLE `centers__question`
  DROP COLUMN IF EXISTS `category_id`;

DROP TABLE IF EXISTS `centers__question_categories`;

