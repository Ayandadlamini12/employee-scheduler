BEGIN;

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS role VARCHAR(30),
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN;

UPDATE employees
SET role = 'employee'
WHERE role IS NULL
   OR role NOT IN ('employee', 'team_leader', 'manager');

UPDATE employees
SET must_change_password = TRUE
WHERE must_change_password IS NULL;

-- Seed a safe default password for existing users: ChangeMe123!
UPDATE employees
SET password_hash = 'scrypt:1208b221ccaa77be8adc5eb11cfe95fd:a79202ff21bfdfa5cc20a77d4a36446a333cce9d1b06b735389b2a4a195f188f688da2d9ac856477e61672a0ab14374eff2a5855541539c95c037344280ef65d'
WHERE password_hash IS NULL;

ALTER TABLE employees
ALTER COLUMN role SET DEFAULT 'employee',
ALTER COLUMN role SET NOT NULL,
ALTER COLUMN must_change_password SET DEFAULT TRUE,
ALTER COLUMN must_change_password SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'employees_role_check'
    ) THEN
        ALTER TABLE employees
        ADD CONSTRAINT employees_role_check
        CHECK (role IN ('employee', 'team_leader', 'manager'));
    END IF;
END $$;

-- Demo admin roles (idempotent)
UPDATE employees
SET role = 'team_leader', must_change_password = TRUE, updated_at = NOW()
WHERE employee_code = 'EMP-1001'
   OR LOWER(email) = 'olivia.martin@example.com';

UPDATE employees
SET role = 'manager', must_change_password = TRUE, updated_at = NOW()
WHERE employee_code = 'EMP-1005'
   OR LOWER(email) = 'sophia.davis@example.com';

COMMIT;
