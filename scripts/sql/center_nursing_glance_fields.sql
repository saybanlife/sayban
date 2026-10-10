-- Nursing-center glance fields (اطلاعات کلیدی).
-- Additive / idempotent where practical: skip if column already exists.
-- Canonical English values (see components/centerPage/centerEnumLocales.ts):
--   dispatch_workforce_types SET:
--     companion | specialist_nurse | exp_alzheimers | exp_stroke | exp_cancer | exp_respiratory
--   license_type ENUM:
--     natural | legal | business_license

ALTER TABLE centers
  ADD COLUMN dispatch_workforce_types SET(
    'companion',
    'specialist_nurse',
    'exp_alzheimers',
    'exp_stroke',
    'exp_cancer',
    'exp_respiratory'
  ) NULL;

ALTER TABLE centers
  ADD COLUMN license_type ENUM(
    'natural',
    'legal',
    'business_license'
  ) NULL;
