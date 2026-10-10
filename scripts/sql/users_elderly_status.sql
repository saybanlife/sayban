-- Persistent per-user answers for «وضعیت سالمند» questionnaire category.
-- Keyed by the elderly person's users.id (self or companion linked user).
-- Pair: scripts/sql/users_elderly_status_rollback.sql

CREATE TABLE IF NOT EXISTS `users__elderly_status` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT 'Elderly person users.id (self or companion)',
  `question_id` BIGINT UNSIGNED NOT NULL,
  `answer` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_elderly_status_user_question` (`user_id`, `question_id`),
  KEY `idx_elderly_status_user` (`user_id`),
  KEY `idx_elderly_status_question` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
