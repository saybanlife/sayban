UPDATE `centers__question`
SET `show_if_question_id` = NULL,
    `show_if_option` = NULL
WHERE `show_if_question_id` IS NOT NULL
   OR `show_if_option` IS NOT NULL;

ALTER TABLE `centers__question`
  DROP INDEX IF EXISTS `idx_centers_question_show_if`;

ALTER TABLE `centers__question`
  DROP COLUMN IF EXISTS `show_if_option`;

ALTER TABLE `centers__question`
  DROP COLUMN IF EXISTS `show_if_question_id`;
