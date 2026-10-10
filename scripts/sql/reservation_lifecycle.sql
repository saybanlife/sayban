-- Additive lifecycle data for nurse interviews, trial shifts and contracts.
-- Safe to run repeatedly; existing reservation rows and columns are untouched.
CREATE TABLE IF NOT EXISTS `reservations__lifecycle` (
  `reservation_id` int(11) NOT NULL,
  `stage` varchar(40) DEFAULT NULL,
  `selected_offer_id` int(11) DEFAULT NULL,
  `interview_options` longtext DEFAULT NULL,
  `interview_at` datetime DEFAULT NULL,
  `interview_mode` enum('online','home','center') DEFAULT NULL,
  `trial_start_at` datetime DEFAULT NULL,
  `trial_end_at` datetime DEFAULT NULL,
  `trial_daily_price` int(10) unsigned DEFAULT NULL,
  `trial_total_price` int(10) unsigned DEFAULT NULL,
  `trial_attendance_user` tinyint(1) DEFAULT NULL,
  `trial_attendance_staff` tinyint(1) DEFAULT NULL,
  `trial_decision` enum('continue','stop') DEFAULT NULL,
  `contract_deadline` datetime DEFAULT NULL,
  `contract_closed_at` datetime DEFAULT NULL,
  `cancellation_policy` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`reservation_id`),
  KEY `idx_reservation_lifecycle_stage` (`stage`),
  KEY `idx_reservation_lifecycle_offer` (`selected_offer_id`),
  CONSTRAINT `fk_reservation_lifecycle_reservation`
    FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reservation_lifecycle_offer`
    FOREIGN KEY (`selected_offer_id`) REFERENCES `centers__offers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
