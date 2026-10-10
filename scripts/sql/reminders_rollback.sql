-- Rollback for scripts/sql/reminders.sql (drops reminder system tables).
-- Order: children first.

DROP TABLE IF EXISTS reminder_wallet_transactions;
DROP TABLE IF EXISTS reminder_deliveries;
DROP TABLE IF EXISTS reminder_occurrences;
DROP TABLE IF EXISTS reminder_templates;
DROP TABLE IF EXISTS reminder_categories;
DROP TABLE IF EXISTS reminder_channel_prices;
DROP TABLE IF EXISTS reminder_wallets;
DROP TABLE IF EXISTS reminders;
