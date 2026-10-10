-- Panel staff FCM registration (mirrors users.fcmToken / users.isnotif).
ALTER TABLE panel__users
  ADD COLUMN fcmToken VARCHAR(255) NULL DEFAULT NULL AFTER password,
  ADD COLUMN isnotif TINYINT(1) NOT NULL DEFAULT 1 AFTER fcmToken;
