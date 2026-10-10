-- Nursing-center overview fields (اطلاعات کلی).
-- Additive / idempotent where practical: skip if column already exists.
-- Canonical English values (see components/centerPage/centerEnumLocales.ts):
--   min_work_experience_unit ENUM: years | months
--   dispatch_tehran_districts SET: all_tehran | karaj | d1..d22
--   dispatch_lead_time ENUM: under_2h | 2_to_4h | same_day | next_day
--   urgent_dispatch ENUM: yes_24h | daytime_only | no
--   activity_days SET: sat | sun | mon | tue | wed | thu | fri

ALTER TABLE centers
  ADD COLUMN active_staff_count INT UNSIGNED NULL;

ALTER TABLE centers
  ADD COLUMN min_work_experience_value INT UNSIGNED NULL;

ALTER TABLE centers
  ADD COLUMN min_work_experience_unit ENUM('years', 'months') NULL;

ALTER TABLE centers
  ADD COLUMN dispatch_tehran_districts SET(
    'all_tehran',
    'karaj',
    'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10', 'd11',
    'd12', 'd13', 'd14', 'd15', 'd16', 'd17', 'd18', 'd19', 'd20', 'd21', 'd22'
  ) NULL;

ALTER TABLE centers
  ADD COLUMN dispatch_lead_time ENUM(
    'under_2h',
    '2_to_4h',
    'same_day',
    'next_day'
  ) NULL;

ALTER TABLE centers
  ADD COLUMN urgent_dispatch ENUM(
    'yes_24h',
    'daytime_only',
    'no'
  ) NULL;

ALTER TABLE centers
  ADD COLUMN activity_days SET(
    'sat',
    'sun',
    'mon',
    'tue',
    'wed',
    'thu',
    'fri'
  ) NULL;

ALTER TABLE centers
  ADD COLUMN response_hours_start VARCHAR(8) NULL;

ALTER TABLE centers
  ADD COLUMN response_hours_end VARCHAR(8) NULL;
