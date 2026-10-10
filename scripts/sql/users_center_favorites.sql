-- User favorites for public centers. Idempotent.
-- Rollback: scripts/sql/users_center_favorites_rollback.sql

CREATE TABLE IF NOT EXISTS `users__center_favorites` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `center_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_center` (`user_id`, `center_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_center` (`center_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
