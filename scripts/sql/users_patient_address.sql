-- Companion (همراه) address.
--
-- The «افزودن همراه» form now collects an address with the same fields the
-- «افزودن آدرس» flow uses, so the columns mirror `users__addresses`:
-- city / address / details / postal_code / latitude / longitude.
--
-- Additive and nullable, so existing rows and the current INSERT keep working.
-- The `add/patients` n8n node (workflow "users", node "MySQL9") inserts with
-- automatic column mapping, which means these columns are populated as soon as
-- the request body carries matching keys — no workflow change is needed for
-- writes. Reads go through node "MySQL10", whose SELECT lists columns
-- explicitly and is patched by scripts/patch-n8n-patients-address.mjs.
--
-- Apply:
--   node .cursor/sayban-ops/pma-sql.js "<statement>"
--
-- Rollback:
--   ALTER TABLE users__patient
--     DROP COLUMN city,
--     DROP COLUMN address,
--     DROP COLUMN details,
--     DROP COLUMN postal_code,
--     DROP COLUMN latitude,
--     DROP COLUMN longitude;

ALTER TABLE users__patient
  ADD COLUMN city VARCHAR(100) NULL AFTER relation,
  ADD COLUMN address VARCHAR(500) NULL AFTER city,
  ADD COLUMN details VARCHAR(255) NULL AFTER address,
  ADD COLUMN postal_code VARCHAR(10) NULL AFTER details,
  ADD COLUMN latitude VARCHAR(32) NULL AFTER postal_code,
  ADD COLUMN longitude VARCHAR(32) NULL AFTER latitude;
