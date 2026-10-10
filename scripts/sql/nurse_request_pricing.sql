-- Nurse / caregiver request pricing rules (per center + platform defaults).
-- Platform defaults: center_id IS NULL.
-- Rollback: scripts/sql/nurse_request_pricing_rollback.sql

CREATE TABLE IF NOT EXISTS `centers__nurse_pricing` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `center_id` int(11) DEFAULT NULL,
  `duration_mode` enum('once','continuous') NOT NULL,
  `role_mode` enum('caregiver','nurse','any') NOT NULL DEFAULT 'any',
  `base_min` int(11) NOT NULL,
  `base_max` int(11) NOT NULL,
  `currency_label` varchar(32) NOT NULL DEFAULT 'تومان',
  `price_period` enum('service','monthly') NOT NULL DEFAULT 'service',
  `factors_json` longtext DEFAULT NULL,
  `note_template` varchar(512) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_nurse_pricing_center_duration_role` (`center_id`,`duration_mode`,`role_mode`),
  KEY `idx_nurse_pricing_center` (`center_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Platform seed (idempotent via unique key on NULL center — MySQL treats NULLs as distinct in UNIQUE;
-- so we delete+insert platform rows by duration/role when center_id IS NULL).
DELETE FROM `centers__nurse_pricing`
WHERE `center_id` IS NULL;

INSERT INTO `centers__nurse_pricing`
  (`center_id`,`duration_mode`,`role_mode`,`base_min`,`base_max`,`price_period`,`factors_json`,`note_template`,`is_active`)
VALUES
  (NULL,'once','any',900000,1200000,'service',
   '[{"key":"night_shift","label":"شیفت شب","effect":"multiply_range","when":{"field":"answers","includes":["شب","شبانه"]},"min":1.05,"max":1.15},{"key":"long_shift_12h","label":"شیفت ۱۲ ساعته","effect":"multiply_range","when":{"field":"shiftHours","equals":"12"},"min":1.05,"max":1.1}]',
   'نمونه. قیمت نهایی را نیروها پیشنهاد می‌دهند.',1),
  (NULL,'continuous','caregiver',28000000,36000000,'monthly',
   '[{"key":"multi_person","label":"چند نفر","effect":"add_range","when":{"field":"answers","includes":["۳ نفر","3 نفر","چند نفر"]},"min":0,"max":2000000}]',
   'نمونه. مرکز بعد از ۲ روز آزمایشی قیمت نهایی را اعلام می‌کند.',1),
  (NULL,'continuous','nurse',12000000,18000000,'monthly',
   '[{"key":"daily_visit_short","label":"ویزیت کوتاه","effect":"multiply_range","when":{"field":"answers","includes":["۱ تا ۲","1 تا 2","ویزیت"]},"min":0.95,"max":1}]',
   'نمونه. مرکز بعد از ۲ روز آزمایشی قیمت نهایی را اعلام می‌کند.',1),
  (NULL,'continuous','any',20000000,30000000,'monthly','[]',
   'نمونه. مرکز بعد از ۲ روز آزمایشی قیمت نهایی را اعلام می‌کند.',1);
