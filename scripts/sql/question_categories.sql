CREATE TABLE IF NOT EXISTS `centers__question_categories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_question_categories_sort` (`sort_order`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `centers__question`
  ADD COLUMN IF NOT EXISTS `category_id` BIGINT UNSIGNED NULL AFTER `id`;

ALTER TABLE `centers__question`
  ADD INDEX IF NOT EXISTS `idx_centers_question_category` (`category_id`);

