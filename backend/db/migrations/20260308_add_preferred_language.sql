BEGIN;

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en';

UPDATE employees
SET preferred_language = 'en'
WHERE preferred_language IS NULL;

ALTER TABLE employees
ALTER COLUMN preferred_language SET NOT NULL;

ALTER TABLE employees
ALTER COLUMN preferred_language SET DEFAULT 'en';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'employees_preferred_language_check'
    ) THEN
        ALTER TABLE employees
        ADD CONSTRAINT employees_preferred_language_check
        CHECK (preferred_language IN ('en', 'zh-TW'));
    END IF;
END $$;

COMMIT;
