-- Sayban — add-center panel: care domain + center owner registration dossier.
--
-- Additive only, so it is safe to run on a live database and easy to roll back
-- (see the DOWN section at the bottom).
--
-- Context:
--   * `centers.center_type` already answers WHEN the center operates
--     (روزانه / شبانه‌روزی / هر دو) and is what the centers-list filter reads.
--   * `centers.care_domain` is a separate axis answering WHAT care it provides
--     (سالمندان / پرستاری / هر دو). These were previously conflated.
--
-- Persian labels for both live in `components/centerPage/centerEnumLocales.ts`;
-- the DB stores English canonical values only.

-- ---------------------------------------------------------------- UP --------

ALTER TABLE centers
  ADD COLUMN care_domain ENUM('elderly', 'nursing', 'both') NULL
  AFTER center_type;

-- «اطلاعات مسئول مرکز» — replaces the old username/password onboarding block.
-- Document columns store uploaded image URLs (not free-text identifiers).
ALTER TABLE centers
  ADD COLUMN manager_last_name VARCHAR(120) NULL,
  ADD COLUMN registered_center_name VARCHAR(255) NULL,
  ADD COLUMN license_number VARCHAR(512) NULL,
  ADD COLUMN establishment_notice VARCHAR(512) NULL,
  ADD COLUMN registration_docs VARCHAR(512) NULL,
  ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected')
    NOT NULL DEFAULT 'approved';

-- Existing rows have no care domain recorded. Elderly care is the platform's
-- original and still dominant category, so it is the safest backfill; centers
-- can be corrected from the panel afterwards.
UPDATE centers
SET care_domain = 'elderly'
WHERE care_domain IS NULL
  AND deleted_at IS NULL;

-- The filter treats `comprehensive` as "runs both shifts", so make sure no row
-- carries a legacy Persian value that would fall outside the ENUM.
UPDATE centers
SET center_type = 'comprehensive'
WHERE REPLACE(center_type, CHAR(8204), '') IN ('جامع', 'هر دو', 'هردو');

-- Filters query these columns on every centers-list request.
CREATE INDEX idx_centers_care_domain ON centers (care_domain);
CREATE INDEX idx_centers_center_type ON centers (center_type);
CREATE INDEX idx_centers_approval_status ON centers (approval_status);

-- Self-serve signup writes approval_status='pending' and is_active=0.
-- Existing rows keep DEFAULT 'approved' so the public listing is unchanged.

-- --------------------------------------------------------------- DOWN -------
-- DROP INDEX idx_centers_approval_status ON centers;
-- DROP INDEX idx_centers_center_type ON centers;
-- DROP INDEX idx_centers_care_domain ON centers;
-- ALTER TABLE centers
--   DROP COLUMN approval_status,
--   DROP COLUMN registration_docs,
--   DROP COLUMN establishment_notice,
--   DROP COLUMN license_number,
--   DROP COLUMN registered_center_name,
--   DROP COLUMN manager_last_name,
--   DROP COLUMN care_domain;
