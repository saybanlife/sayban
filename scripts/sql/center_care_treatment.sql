-- Care & treatment («مراقبت و درمان») structure for the public Center page.
--
-- The section is made of three groups:
--   1. Fixed facilities (yes/no)  → centers__care_items + centers__care_item_values
--   2. Selectable services with a visit frequency → centers__specialists
--   3. A doctor entry that also carries a kind (general / specialist)
--
-- `centers__specialists.specialist_type` already covered every service in
-- group 2, so this migration only adds the doctor value plus the frequency /
-- doctor columns. Everything here is additive, so it is safe to roll back.
--
-- Applied to sayban_db on 2026-08-27.

-- 1. Allow the doctor entry alongside the existing specialists.
ALTER TABLE `centers__specialists`
  MODIFY COLUMN `specialist_type` ENUM(
    'psychologist',
    'psychiatrist',
    'geriatrician',
    'physiotherapist',
    'occupational_therapist',
    'social_worker',
    'dentist',
    'speech_therapist',
    'medication_manager',
    'doctor'
  ) NOT NULL;

-- 2. Visit cadence for every service, and the doctor-only extras.
--    `days_of_week` is kept as-is so existing rows stay readable.
ALTER TABLE `centers__specialists`
  ADD COLUMN `frequency` ENUM('daily', 'every_other_day', 'several_times_week')
    NULL DEFAULT NULL AFTER `specialist_type`,
  ADD COLUMN `doctor_kind` ENUM('general', 'specialist')
    NULL DEFAULT NULL AFTER `frequency`,
  ADD COLUMN `visit_interval` VARCHAR(80)
    NULL DEFAULT NULL AFTER `doctor_kind`;

-- 3. The always-on facilities shown above the selectable services.
--    `centers__care_items` is a shared library, so seed it once.
INSERT INTO `centers__care_items` (`name`, `slug`, `sort_order`, `is_active`)
SELECT * FROM (
  SELECT 'حضور مراقب یا کمک‌بهیار به‌صورت شبانه‌روزی' AS name,
         'caregiver_aide_24h' AS slug, 1 AS sort_order, 1 AS is_active
  UNION ALL SELECT 'امکان مراقب اختصاصی', 'dedicated_caregiver', 2, 1
  UNION ALL SELECT 'متخصص تغذیه', 'nutritionist', 3, 1
  UNION ALL SELECT 'همکاری با بیمارستان', 'hospital_cooperation', 4, 1
) AS seed
WHERE NOT EXISTS (
  SELECT 1 FROM `centers__care_items` existing WHERE existing.`slug` = seed.`slug`
);

-- Rollback:
-- DELETE FROM `centers__care_items`
--  WHERE `slug` IN ('caregiver_aide_24h', 'dedicated_caregiver',
--                   'nutritionist', 'hospital_cooperation');
-- ALTER TABLE `centers__specialists`
--   DROP COLUMN `visit_interval`,
--   DROP COLUMN `doctor_kind`,
--   DROP COLUMN `frequency`;
-- ALTER TABLE `centers__specialists`
--   MODIFY COLUMN `specialist_type` ENUM(
--     'psychologist','psychiatrist','geriatrician','physiotherapist',
--     'occupational_therapist','social_worker','dentist','speech_therapist',
--     'medication_manager'
--   ) NOT NULL;
