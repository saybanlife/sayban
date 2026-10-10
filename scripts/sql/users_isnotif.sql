-- Additive migration: persist the user's notification preference/status.
ALTER TABLE users
  ADD COLUMN isnotif TINYINT(1) NOT NULL DEFAULT 0 AFTER fcmToken;
