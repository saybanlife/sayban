-- Normalize centers ENUM/SET columns to English canonical values.
-- Safe sequence: widen → remap data (incl. legacy Persian) → tighten types.
-- Canonical map (see components/centerPage/centerEnumLocales.ts):
--   center_type: residential | day_care | comprehensive
--   admission_gender: women | men | both_separate
--   doctor_type: general | specialist | comprehensive
--   caregiver_type: nurse | caregiver
--   room_types: independent | double | multi

-- 1) Widen to VARCHAR so remaps cannot fail ENUM checks.
ALTER TABLE centers
  MODIFY COLUMN center_type VARCHAR(64) NULL,
  MODIFY COLUMN admission_gender VARCHAR(128) NULL,
  MODIFY COLUMN doctor_type VARCHAR(128) NULL,
  MODIFY COLUMN caregiver_type VARCHAR(128) NULL,
  MODIFY COLUMN room_types VARCHAR(255) NULL;

-- 2) Remap legacy Persian / spaced variants → English.
UPDATE centers SET center_type = CASE
  WHEN center_type IS NULL OR TRIM(center_type) = '' THEN NULL
  WHEN REPLACE(center_type, CHAR(8204), '') IN ('شبانه روزی', 'شبانه‌روزی', 'residential', 'overnight') THEN 'residential'
  WHEN center_type IN ('روزانه', 'day_care', 'daycare') THEN 'day_care'
  WHEN center_type IN ('جامع', 'comprehensive') THEN 'comprehensive'
  ELSE center_type
END;

UPDATE centers SET admission_gender = CASE
  WHEN admission_gender IS NULL OR TRIM(admission_gender) = '' THEN NULL
  WHEN REPLACE(admission_gender, CHAR(8204), '') IN ('خانم‌ها', 'خانمها', 'فقط خانم‌ها', 'women') THEN 'women'
  WHEN REPLACE(admission_gender, CHAR(8204), '') IN ('آقایان', 'فقط آقایان', 'men') THEN 'men'
  WHEN admission_gender IN (
    'هردو در بخش مجزا',
    'هر دو در بخش مجزا',
    'خانم‌ها و آقایان در بخش‌های مجزا',
    'both_separate'
  ) THEN 'both_separate'
  ELSE admission_gender
END;

UPDATE centers SET doctor_type = CASE
  WHEN doctor_type IS NULL OR TRIM(doctor_type) = '' THEN NULL
  WHEN doctor_type IN ('عمومی', 'general') THEN 'general'
  WHEN doctor_type IN ('متخصص', 'specialist') THEN 'specialist'
  WHEN doctor_type IN ('جامع', 'comprehensive') THEN 'comprehensive'
  -- Keep already-valid multi SET strings that only use English tokens.
  ELSE doctor_type
END;

UPDATE centers SET caregiver_type = CASE
  WHEN caregiver_type IS NULL OR TRIM(caregiver_type) = '' THEN NULL
  WHEN caregiver_type IN ('پرستار متخصص', 'پرستار', 'nurse') THEN 'nurse'
  WHEN caregiver_type IN ('مراقب', 'caregiver') THEN 'caregiver'
  ELSE caregiver_type
END;

UPDATE centers SET room_types = CASE
  WHEN room_types IS NULL OR TRIM(room_types) = '' THEN NULL
  WHEN room_types IN ('مستقل', 'independent') THEN 'independent'
  WHEN room_types IN ('۲ تخته', '2 تخته', 'دو تخته', 'double') THEN 'double'
  WHEN room_types IN ('چند تخته', 'multi') THEN 'multi'
  -- Convert legacy " / " joined Persian lists into MySQL SET commas when possible.
  WHEN room_types LIKE '%/%' OR room_types LIKE '%،%' THEN room_types
  ELSE room_types
END;

-- 3) Tighten to English-only ENUM/SET.
ALTER TABLE centers
  MODIFY COLUMN center_type ENUM('residential', 'day_care', 'comprehensive') NULL,
  MODIFY COLUMN admission_gender ENUM('women', 'men', 'both_separate') NULL,
  MODIFY COLUMN doctor_type SET('general', 'specialist', 'comprehensive') NULL,
  MODIFY COLUMN caregiver_type SET('nurse', 'caregiver') NULL,
  MODIFY COLUMN room_types SET('independent', 'double', 'multi') NULL;
