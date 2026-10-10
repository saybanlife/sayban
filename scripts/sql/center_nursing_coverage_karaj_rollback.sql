-- Rollback: remove karaj from dispatch_tehran_districts SET.
-- Clears rows that only had karaj; strips karaj from mixed SETs before MODIFY.

UPDATE centers
SET dispatch_tehran_districts = TRIM(BOTH ',' FROM REPLACE(
  CONCAT(',', COALESCE(dispatch_tehran_districts, ''), ','),
  ',karaj,',
  ','
))
WHERE FIND_IN_SET('karaj', COALESCE(dispatch_tehran_districts, '')) > 0;

UPDATE centers
SET dispatch_tehran_districts = NULL
WHERE dispatch_tehran_districts = '';

ALTER TABLE centers
  MODIFY COLUMN dispatch_tehran_districts SET(
    'all_tehran',
    'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10', 'd11',
    'd12', 'd13', 'd14', 'd15', 'd16', 'd17', 'd18', 'd19', 'd20', 'd21', 'd22'
  ) NULL;
