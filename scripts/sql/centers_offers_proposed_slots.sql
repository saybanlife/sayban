-- Additive: multiple interview time proposals per nurse offer.
-- Rollback: scripts/sql/centers_offers_proposed_slots_rollback.sql
--
--   node .cursor/sayban-ops/pma-sql.js "ALTER TABLE centers__offers ADD COLUMN proposed_slots longtext DEFAULT NULL AFTER proposed_time"
--
-- If the column already exists, MariaDB returns ER_DUP_FIELDNAME — safe to ignore.

ALTER TABLE `centers__offers`
  ADD COLUMN `proposed_slots` longtext DEFAULT NULL AFTER `proposed_time`;
