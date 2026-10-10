-- Direct fact columns on centers for admin facts cards + public overview.
-- Prefer English ENUM/SET values (see center_enums_english.sql + centerEnumLocales.ts).
-- Skip any statement whose column already exists.

ALTER TABLE centers ADD COLUMN center_type ENUM('residential', 'day_care', 'comprehensive') NULL;
ALTER TABLE centers ADD COLUMN admission_gender ENUM('women', 'men', 'both_separate') NULL;
ALTER TABLE centers ADD COLUMN total_capacity INT UNSIGNED NULL;
ALTER TABLE centers ADD COLUMN founded_year SMALLINT UNSIGNED NULL;
ALTER TABLE centers ADD COLUMN care_staff_count INT UNSIGNED NULL;
ALTER TABLE centers ADD COLUMN min_monthly_fee INT NULL;
ALTER TABLE centers ADD COLUMN max_monthly_fee INT NULL;
ALTER TABLE centers ADD COLUMN has_night_nurse TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE centers ADD COLUMN distance_to_hospital_km DECIMAL(5, 2) NULL;
ALTER TABLE centers ADD COLUMN doctor_type SET('general', 'specialist', 'comprehensive') NULL;
ALTER TABLE centers ADD COLUMN caregiver_type SET('nurse', 'caregiver') NULL;
ALTER TABLE centers ADD COLUMN room_types SET('independent', 'double', 'multi') NULL;
