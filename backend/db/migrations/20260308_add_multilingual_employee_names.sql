BEGIN;

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS english_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS chinese_name VARCHAR(255);

UPDATE employees
SET english_name = CONCAT(first_name, ' ', last_name)
WHERE english_name IS NULL
  AND (first_name IS NOT NULL OR last_name IS NOT NULL);

COMMIT;
