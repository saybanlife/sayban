-- Profile section items for center public page (care / daily life / family visit)
-- Run once on sayban MySQL before enabling n8n /panel/profile-sections webhooks.

CREATE TABLE IF NOT EXISTS centers__profile_sections (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  center_id INT NOT NULL,
  section VARCHAR(32) NOT NULL,
  item_key VARCHAR(64) NOT NULL,
  label VARCHAR(255) NOT NULL,
  value TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_center_section_key (center_id, section, item_key),
  KEY idx_center_section (center_id, section, is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
