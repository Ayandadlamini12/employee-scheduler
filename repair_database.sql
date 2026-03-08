BEGIN;

SET search_path TO public;

-- 1) Base tables (create if missing) in dependency order.

CREATE TABLE IF NOT EXISTS employees (
  id BIGSERIAL PRIMARY KEY,
  employee_code VARCHAR(30) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  english_name VARCHAR(255),
  chinese_name VARCHAR(255),
  preferred_language VARCHAR(10) NOT NULL DEFAULT 'en',
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(30),
  role_title VARCHAR(100) NOT NULL,
  employment_type VARCHAR(30) NOT NULL DEFAULT 'full_time',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  hired_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shifts (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_overnight BOOLEAN NOT NULL DEFAULT FALSE,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  required_role VARCHAR(100),
  color_hex CHAR(7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedules (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  shift_id BIGINT NOT NULL,
  schedule_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS availability (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  day_of_week SMALLINT,
  availability_date DATE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  recurrence_type VARCHAR(20) NOT NULL DEFAULT 'weekly',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS requests (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  request_type VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  schedule_id BIGINT,
  target_employee_id BIGINT,
  requested_start TIMESTAMPTZ,
  requested_end TIMESTAMPTZ,
  reason TEXT,
  reviewer_id BIGINT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_fixed_schedule (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL,
  day_of_week SMALLINT NOT NULL,
  shift_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Add missing columns and normalize data safely.

ALTER TABLE IF EXISTS employees
  ADD COLUMN IF NOT EXISTS employee_code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS english_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS chinese_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS role_title VARCHAR(100),
  ADD COLUMN IF NOT EXISTS employment_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS hired_on DATE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE employees
SET english_name = CONCAT_WS(' ', first_name, last_name)
WHERE english_name IS NULL
  AND (first_name IS NOT NULL OR last_name IS NOT NULL);

UPDATE employees
SET preferred_language = 'en'
WHERE preferred_language IS NULL
   OR preferred_language NOT IN ('en', 'zh-TW');

UPDATE employees
SET created_at = NOW()
WHERE created_at IS NULL;

UPDATE employees
SET updated_at = NOW()
WHERE updated_at IS NULL;

UPDATE employees
SET employment_type = 'full_time'
WHERE employment_type IS NULL
   OR employment_type NOT IN ('full_time', 'part_time', 'contract', 'temp');

UPDATE employees
SET status = 'active'
WHERE status IS NULL
   OR status NOT IN ('active', 'inactive', 'on_leave', 'terminated');

ALTER TABLE employees
  ALTER COLUMN preferred_language SET DEFAULT 'en',
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN preferred_language SET NOT NULL;

ALTER TABLE IF EXISTS shifts
  ADD COLUMN IF NOT EXISTS name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME,
  ADD COLUMN IF NOT EXISTS is_overnight BOOLEAN,
  ADD COLUMN IF NOT EXISTS break_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS required_role VARCHAR(100),
  ADD COLUMN IF NOT EXISTS color_hex CHAR(7),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE shifts SET is_overnight = FALSE WHERE is_overnight IS NULL;
UPDATE shifts SET break_minutes = 0 WHERE break_minutes IS NULL OR break_minutes < 0;
UPDATE shifts SET created_at = NOW() WHERE created_at IS NULL;
UPDATE shifts SET updated_at = NOW() WHERE updated_at IS NULL;

ALTER TABLE shifts
  ALTER COLUMN is_overnight SET DEFAULT FALSE,
  ALTER COLUMN break_minutes SET DEFAULT 0,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE IF EXISTS schedules
  ADD COLUMN IF NOT EXISTS employee_id BIGINT,
  ADD COLUMN IF NOT EXISTS shift_id BIGINT,
  ADD COLUMN IF NOT EXISTS schedule_date DATE,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE schedules
SET status = 'scheduled'
WHERE status IS NULL
   OR status NOT IN ('scheduled', 'published', 'completed', 'cancelled');

UPDATE schedules SET created_at = NOW() WHERE created_at IS NULL;
UPDATE schedules SET updated_at = NOW() WHERE updated_at IS NULL;

ALTER TABLE schedules
  ALTER COLUMN status SET DEFAULT 'scheduled',
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE IF EXISTS requests
  ADD COLUMN IF NOT EXISTS employee_id BIGINT,
  ADD COLUMN IF NOT EXISTS request_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS schedule_id BIGINT,
  ADD COLUMN IF NOT EXISTS target_employee_id BIGINT,
  ADD COLUMN IF NOT EXISTS requested_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS requested_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_id BIGINT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE requests
SET status = 'pending'
WHERE status IS NULL
   OR status NOT IN ('pending', 'approved', 'rejected', 'cancelled');

UPDATE requests
SET request_type = 'availability_change'
WHERE request_type IS NULL
   OR request_type NOT IN ('time_off', 'shift_swap', 'open_shift', 'availability_change');

UPDATE requests SET created_at = NOW() WHERE created_at IS NULL;
UPDATE requests SET updated_at = NOW() WHERE updated_at IS NULL;

ALTER TABLE requests
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE IF EXISTS availability
  ADD COLUMN IF NOT EXISTS employee_id BIGINT,
  ADD COLUMN IF NOT EXISTS day_of_week SMALLINT,
  ADD COLUMN IF NOT EXISTS availability_date DATE,
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME,
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN,
  ADD COLUMN IF NOT EXISTS recurrence_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE availability SET is_available = TRUE WHERE is_available IS NULL;
UPDATE availability
SET recurrence_type = 'weekly'
WHERE recurrence_type IS NULL
   OR recurrence_type NOT IN ('weekly', 'date_specific');
UPDATE availability SET created_at = NOW() WHERE created_at IS NULL;
UPDATE availability SET updated_at = NOW() WHERE updated_at IS NULL;

ALTER TABLE availability
  ALTER COLUMN is_available SET DEFAULT TRUE,
  ALTER COLUMN recurrence_type SET DEFAULT 'weekly',
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE IF EXISTS employee_fixed_schedule
  ADD COLUMN IF NOT EXISTS employee_id BIGINT,
  ADD COLUMN IF NOT EXISTS day_of_week SMALLINT,
  ADD COLUMN IF NOT EXISTS shift_id BIGINT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE employee_fixed_schedule SET created_at = NOW() WHERE created_at IS NULL;
UPDATE employee_fixed_schedule SET updated_at = NOW() WHERE updated_at IS NULL;

ALTER TABLE employee_fixed_schedule
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

-- 3) Constraints (add only if missing).

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_status_check') THEN
        ALTER TABLE employees
        ADD CONSTRAINT employees_status_check
        CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_employment_type_check') THEN
        ALTER TABLE employees
        ADD CONSTRAINT employees_employment_type_check
        CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'temp')) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_preferred_language_check') THEN
        ALTER TABLE employees
        ADD CONSTRAINT employees_preferred_language_check
        CHECK (preferred_language IN ('en', 'zh-TW')) NOT VALID;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shifts_break_minutes_check') THEN
        ALTER TABLE shifts
        ADD CONSTRAINT shifts_break_minutes_check
        CHECK (break_minutes >= 0) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shifts_color_hex_check') THEN
        ALTER TABLE shifts
        ADD CONSTRAINT shifts_color_hex_check
        CHECK (color_hex IS NULL OR color_hex ~ '^#[0-9A-Fa-f]{6}$') NOT VALID;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedules_status_check') THEN
        ALTER TABLE schedules
        ADD CONSTRAINT schedules_status_check
        CHECK (status IN ('scheduled', 'published', 'completed', 'cancelled')) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedules_employee_id_fkey') THEN
        ALTER TABLE schedules
        ADD CONSTRAINT schedules_employee_id_fkey
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedules_shift_id_fkey') THEN
        ALTER TABLE schedules
        ADD CONSTRAINT schedules_shift_id_fkey
        FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedules_unique_assignment') THEN
        IF EXISTS (
            SELECT 1
            FROM (
                SELECT employee_id, shift_id, schedule_date, COUNT(*)
                FROM schedules
                GROUP BY employee_id, shift_id, schedule_date
                HAVING COUNT(*) > 1
            ) d
        ) THEN
            RAISE NOTICE 'Skipping schedules_unique_assignment due duplicate rows.';
        ELSE
            ALTER TABLE schedules
            ADD CONSTRAINT schedules_unique_assignment
            UNIQUE (employee_id, shift_id, schedule_date);
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'availability_day_of_week_check') THEN
        ALTER TABLE availability
        ADD CONSTRAINT availability_day_of_week_check
        CHECK (day_of_week BETWEEN 0 AND 6 OR day_of_week IS NULL) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'availability_recurrence_type_check') THEN
        ALTER TABLE availability
        ADD CONSTRAINT availability_recurrence_type_check
        CHECK (recurrence_type IN ('weekly', 'date_specific')) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'availability_scope_check') THEN
        ALTER TABLE availability
        ADD CONSTRAINT availability_scope_check
        CHECK (
          (recurrence_type = 'weekly' AND day_of_week IS NOT NULL AND availability_date IS NULL) OR
          (recurrence_type = 'date_specific' AND day_of_week IS NULL AND availability_date IS NOT NULL)
        ) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'availability_employee_id_fkey') THEN
        ALTER TABLE availability
        ADD CONSTRAINT availability_employee_id_fkey
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'requests_type_check') THEN
        ALTER TABLE requests
        ADD CONSTRAINT requests_type_check
        CHECK (request_type IN ('time_off', 'shift_swap', 'open_shift', 'availability_change')) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'requests_status_check') THEN
        ALTER TABLE requests
        ADD CONSTRAINT requests_status_check
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'requests_time_range_check') THEN
        ALTER TABLE requests
        ADD CONSTRAINT requests_time_range_check
        CHECK (requested_end IS NULL OR requested_start IS NULL OR requested_end > requested_start) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'requests_employee_id_fkey') THEN
        ALTER TABLE requests
        ADD CONSTRAINT requests_employee_id_fkey
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'requests_schedule_id_fkey') THEN
        ALTER TABLE requests
        ADD CONSTRAINT requests_schedule_id_fkey
        FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'requests_target_employee_id_fkey') THEN
        ALTER TABLE requests
        ADD CONSTRAINT requests_target_employee_id_fkey
        FOREIGN KEY (target_employee_id) REFERENCES employees(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'requests_reviewer_id_fkey') THEN
        ALTER TABLE requests
        ADD CONSTRAINT requests_reviewer_id_fkey
        FOREIGN KEY (reviewer_id) REFERENCES employees(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_fixed_schedule_day_of_week_check') THEN
        ALTER TABLE employee_fixed_schedule
        ADD CONSTRAINT employee_fixed_schedule_day_of_week_check
        CHECK (day_of_week BETWEEN 0 AND 6) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_fixed_schedule_unique_employee_day') THEN
        IF EXISTS (
            SELECT 1
            FROM (
                SELECT employee_id, day_of_week, COUNT(*)
                FROM employee_fixed_schedule
                GROUP BY employee_id, day_of_week
                HAVING COUNT(*) > 1
            ) d
        ) THEN
            RAISE NOTICE 'Skipping employee_fixed_schedule_unique_employee_day due duplicate rows.';
        ELSE
            ALTER TABLE employee_fixed_schedule
            ADD CONSTRAINT employee_fixed_schedule_unique_employee_day
            UNIQUE (employee_id, day_of_week);
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_fixed_schedule_employee_id_fkey') THEN
        ALTER TABLE employee_fixed_schedule
        ADD CONSTRAINT employee_fixed_schedule_employee_id_fkey
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_fixed_schedule_shift_id_fkey') THEN
        ALTER TABLE employee_fixed_schedule
        ADD CONSTRAINT employee_fixed_schedule_shift_id_fkey
        FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE RESTRICT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_employee_code_key') THEN
        IF EXISTS (
            SELECT 1
            FROM (
                SELECT employee_code, COUNT(*)
                FROM employees
                WHERE employee_code IS NOT NULL
                GROUP BY employee_code
                HAVING COUNT(*) > 1
            ) d
        ) THEN
            RAISE NOTICE 'Skipping employees_employee_code_key due duplicate employee_code values.';
        ELSE
            ALTER TABLE employees
            ADD CONSTRAINT employees_employee_code_key UNIQUE (employee_code);
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_email_key') THEN
        IF EXISTS (
            SELECT 1
            FROM (
                SELECT email, COUNT(*)
                FROM employees
                WHERE email IS NOT NULL
                GROUP BY email
                HAVING COUNT(*) > 1
            ) d
        ) THEN
            RAISE NOTICE 'Skipping employees_email_key due duplicate email values.';
        ELSE
            ALTER TABLE employees
            ADD CONSTRAINT employees_email_key UNIQUE (email);
        END IF;
    END IF;
END $$;

-- 4) Indexes.

CREATE INDEX IF NOT EXISTS idx_schedules_employee_date ON schedules (employee_id, schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules (schedule_date);
CREATE INDEX IF NOT EXISTS idx_availability_employee ON availability (employee_id);
CREATE INDEX IF NOT EXISTS idx_requests_employee_status ON requests (employee_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_schedule ON requests (schedule_id);
CREATE INDEX IF NOT EXISTS idx_employee_fixed_schedule_employee ON employee_fixed_schedule (employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_fixed_schedule_shift ON employee_fixed_schedule (shift_id);

COMMIT;
