-- Add Karaj to nursing coverage SET (idempotent via MODIFY).
-- Canonical: all_tehran | karaj | d1..d22

ALTER TABLE centers
  MODIFY COLUMN dispatch_tehran_districts SET(
    'all_tehran',
    'karaj',
    'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10', 'd11',
    'd12', 'd13', 'd14', 'd15', 'd16', 'd17', 'd18', 'd19', 'd20', 'd21', 'd22'
  ) NULL;
