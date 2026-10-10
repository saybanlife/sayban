CREATE TABLE IF NOT EXISTS `support__callback_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT 'users.id of the requester',
  `phone` VARCHAR(20) NOT NULL,
  `time_preference` ENUM('anytime', 'specific') NOT NULL DEFAULT 'anytime',
  `preferred_time` VARCHAR(16) NULL COMMENT 'HH:MM when time_preference=specific',
  `source` VARCHAR(64) NULL DEFAULT 'nurse_request',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_support_callback_user` (`user_id`),
  KEY `idx_support_callback_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
