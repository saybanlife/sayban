-- Rollback for centers_offers_proposed_slots.sql
--   node .cursor/sayban-ops/pma-sql.js "ALTER TABLE centers__offers DROP COLUMN proposed_slots"

ALTER TABLE `centers__offers`
  DROP COLUMN `proposed_slots`;
