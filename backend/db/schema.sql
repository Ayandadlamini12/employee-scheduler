BEGIN;

-- Employees in the organization.
CREATE TABLE IF NOT EXISTS employees (
  id BIGSERIAL PRIMARY KEY,
  employee_code VARCHAR(30) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  english_name VARCHAR(255),
  chinese_name VARCHAR(255),
  preferred_language VARCHAR(10) NOT NULL DEFAULT 'en',
  role VARCHAR(30) NOT NULL DEFAULT 'employee',
  password_hash TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(30),
  role_title VARCHAR(100) NOT NULL,
  employment_type VARCHAR(30) NOT NULL DEFAULT 'full_time',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  hired_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employees_status_check CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated')),
  CONSTRAINT employees_employment_type_check CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'temp')),
  CONSTRAINT employees_role_check CHECK (role IN ('employee', 'team_leader', 'manager')),
  CONSTRAINT employees_preferred_language_check CHECK (preferred_language IN ('en', 'zh-TW'))
);

-- Shift templates (e.g. opening, mid, closing).
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT shifts_break_minutes_check CHECK (break_minutes >= 0),
  CONSTRAINT shifts_color_hex_check CHECK (color_hex IS NULL OR color_hex ~ '^#[0-9A-Fa-f]{6}$')
);

-- Scheduled employee assignments by date and shift.
CREATE TABLE IF NOT EXISTS schedules (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_id BIGINT NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
  schedule_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT schedules_status_check CHECK (status IN ('scheduled', 'published', 'completed', 'cancelled')),
  CONSTRAINT schedules_unique_assignment UNIQUE (employee_id, shift_id, schedule_date)
);

-- Employee availability windows. Supports recurring by weekday or one-off by date.
CREATE TABLE IF NOT EXISTS availability (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week SMALLINT,
  availability_date DATE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  recurrence_type VARCHAR(20) NOT NULL DEFAULT 'weekly',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT availability_day_of_week_check CHECK (day_of_week BETWEEN 0 AND 6 OR day_of_week IS NULL),
  CONSTRAINT availability_recurrence_type_check CHECK (recurrence_type IN ('weekly', 'date_specific')),
  CONSTRAINT availability_scope_check CHECK (
    (recurrence_type = 'weekly' AND day_of_week IS NOT NULL AND availability_date IS NULL) OR
    (recurrence_type = 'date_specific' AND day_of_week IS NULL AND availability_date IS NOT NULL)
  )
);

-- Employee requests such as time off, swap, open shift pickup, etc.
CREATE TABLE IF NOT EXISTS requests (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  request_type VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  schedule_id BIGINT REFERENCES schedules(id) ON DELETE SET NULL,
  target_employee_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
  requested_start TIMESTAMPTZ,
  requested_end TIMESTAMPTZ,
  reason TEXT,
  reviewer_id BIGINT REFERENCES employees(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT requests_type_check CHECK (
    request_type IN ('time_off', 'shift_swap', 'open_shift', 'availability_change')
  ),
  CONSTRAINT requests_status_check CHECK (
    status IN ('pending', 'approved', 'rejected', 'cancelled')
  ),
  CONSTRAINT requests_time_range_check CHECK (
    requested_end IS NULL OR requested_start IS NULL OR requested_end > requested_start
  )
);

-- Fixed weekly schedule template by employee and weekday.
-- day_of_week follows PostgreSQL/JS convention: 0=Sunday ... 6=Saturday.
CREATE TABLE IF NOT EXISTS employee_fixed_schedule (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL,
  shift_id BIGINT NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_fixed_schedule_day_of_week_check CHECK (day_of_week BETWEEN 0 AND 6),
  CONSTRAINT employee_fixed_schedule_unique_employee_day UNIQUE (employee_id, day_of_week)
);

-- Internal announcements published by admins/team leaders.
CREATE TABLE IF NOT EXISTS announcements (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  created_by BIGINT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT announcements_priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Discussion comments under announcements.
CREATE TABLE IF NOT EXISTS announcement_comments (
  id BIGSERIAL PRIMARY KEY,
  announcement_id BIGINT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  author_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_employee_date ON schedules (employee_id, schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules (schedule_date);
CREATE INDEX IF NOT EXISTS idx_availability_employee ON availability (employee_id);
CREATE INDEX IF NOT EXISTS idx_requests_employee_status ON requests (employee_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_schedule ON requests (schedule_id);
CREATE INDEX IF NOT EXISTS idx_employee_fixed_schedule_employee ON employee_fixed_schedule (employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_fixed_schedule_shift ON employee_fixed_schedule (shift_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements (priority);
CREATE INDEX IF NOT EXISTS idx_announcement_comments_announcement_created ON announcement_comments (announcement_id, created_at ASC);

COMMIT;
