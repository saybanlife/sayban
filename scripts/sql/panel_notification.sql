-- Panel staff in-app inbox (mirrors users__notification).
-- Safe to re-run: CREATE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS panel__notification (
  id BIGINT(20) NOT NULL AUTO_INCREMENT,
  panel_user_id BIGINT(20) NULL COMMENT 'Target panel__users.id; 0 = broadcast to all staff',
  image TEXT NULL,
  title VARCHAR(255) NULL,
  text TEXT NOT NULL,
  action TEXT NULL,
  text_action INT(11) NULL,
  notification_type ENUM(
    'system',
    'order_approved',
    'order_rejected',
    'reminder',
    'promotion',
    'other'
  ) NOT NULL DEFAULT 'system',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_seen TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_panel_notification_user (panel_user_id),
  KEY idx_panel_notification_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
