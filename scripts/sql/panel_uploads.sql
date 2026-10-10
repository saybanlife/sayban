-- Independent registry of panel uploads (Liom CDN URLs).
-- Used later for gallery; no UI depends on this yet.
CREATE TABLE IF NOT EXISTS `panel__uploads` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `url` VARCHAR(1024) NOT NULL,
  `path` VARCHAR(64) NOT NULL DEFAULT 'sayban',
  `original_name` VARCHAR(255) NULL,
  `mime_type` VARCHAR(128) NULL,
  `uploaded_by` INT NULL COMMENT 'panel__users.id when known',
  `center_id` INT NULL COMMENT 'optional centre context for future gallery',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_panel_uploads_created` (`created_at`),
  KEY `idx_panel_uploads_by` (`uploaded_by`),
  KEY `idx_panel_uploads_center` (`center_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
