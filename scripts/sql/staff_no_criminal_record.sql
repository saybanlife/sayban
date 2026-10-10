-- Boolean flag: nurse/staff has a clean criminal-record clearance.
-- English column; UI label is «عدم سوءپیشینه».
-- Idempotent: skip if column already exists (run via pma / migration runner that tolerates duplicates).

ALTER TABLE centers__staffs
  ADD COLUMN no_criminal_record TINYINT(1) NOT NULL DEFAULT 0
  AFTER clearance_img;
