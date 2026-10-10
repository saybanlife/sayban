-- Rollback for panel_users_fcm.sql
ALTER TABLE panel__users
  DROP COLUMN isnotif,
  DROP COLUMN fcmToken;
