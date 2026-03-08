BEGIN;

-- Seed employees (upsert by unique email).
-- Default login password for seeded users is ChangeMe123! and must be changed on first login.
INSERT INTO employees (
  employee_code,
  first_name,
  last_name,
  english_name,
  chinese_name,
  preferred_language,
  role,
  password_hash,
  must_change_password,
  email,
  phone,
  role_title,
  employment_type,
  status,
  hired_on
)
VALUES
  ('EMP-1001', 'Olivia', 'Martin', 'Olivia Martin', E'\u738b\u8389\u7dad\u4e9e', 'en', 'team_leader', 'scrypt:1208b221ccaa77be8adc5eb11cfe95fd:a79202ff21bfdfa5cc20a77d4a36446a333cce9d1b06b735389b2a4a195f188f688da2d9ac856477e61672a0ab14374eff2a5855541539c95c037344280ef65d', TRUE, 'olivia.martin@example.com', '+1-555-0101', 'Supervisor', 'full_time', 'active', '2024-02-12'),
  ('EMP-1002', 'Ethan', 'Clark', 'Ethan Clark', E'\u514b\u62c9\u514b', 'en', 'employee', 'scrypt:1208b221ccaa77be8adc5eb11cfe95fd:a79202ff21bfdfa5cc20a77d4a36446a333cce9d1b06b735389b2a4a195f188f688da2d9ac856477e61672a0ab14374eff2a5855541539c95c037344280ef65d', TRUE, 'ethan.clark@example.com', '+1-555-0102', 'Cashier', 'part_time', 'active', '2024-03-05'),
  ('EMP-1003', 'Mia', 'Johnson', 'Mia Johnson', E'\u7c73\u5a6d', 'zh-TW', 'employee', 'scrypt:1208b221ccaa77be8adc5eb11cfe95fd:a79202ff21bfdfa5cc20a77d4a36446a333cce9d1b06b735389b2a4a195f188f688da2d9ac856477e61672a0ab14374eff2a5855541539c95c037344280ef65d', TRUE, 'mia.johnson@example.com', '+1-555-0103', 'Stock Associate', 'part_time', 'active', '2024-04-17'),
  ('EMP-1004', 'Noah', 'Williams', 'Noah Williams', E'\u8afe\u4e9e', 'zh-TW', 'employee', 'scrypt:1208b221ccaa77be8adc5eb11cfe95fd:a79202ff21bfdfa5cc20a77d4a36446a333cce9d1b06b735389b2a4a195f188f688da2d9ac856477e61672a0ab14374eff2a5855541539c95c037344280ef65d', TRUE, 'noah.williams@example.com', '+1-555-0104', 'Barista', 'part_time', 'active', '2024-05-03'),
  ('EMP-1005', 'Sophia', 'Davis', 'Sophia Davis', E'\u8607\u83f2\u4e9e', 'en', 'manager', 'scrypt:1208b221ccaa77be8adc5eb11cfe95fd:a79202ff21bfdfa5cc20a77d4a36446a333cce9d1b06b735389b2a4a195f188f688da2d9ac856477e61672a0ab14374eff2a5855541539c95c037344280ef65d', TRUE, 'sophia.davis@example.com', '+1-555-0105', 'Assistant Manager', 'full_time', 'active', '2023-11-20')
ON CONFLICT (email) DO UPDATE
SET
  employee_code = EXCLUDED.employee_code,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  english_name = EXCLUDED.english_name,
  chinese_name = EXCLUDED.chinese_name,
  preferred_language = EXCLUDED.preferred_language,
  role = EXCLUDED.role,
  password_hash = COALESCE(employees.password_hash, EXCLUDED.password_hash),
  must_change_password = COALESCE(employees.must_change_password, EXCLUDED.must_change_password),
  phone = EXCLUDED.phone,
  role_title = EXCLUDED.role_title,
  employment_type = EXCLUDED.employment_type,
  status = EXCLUDED.status,
  hired_on = EXCLUDED.hired_on,
  updated_at = NOW();

-- Seed shift templates (insert only if same name/start/end does not already exist).
INSERT INTO shifts (
  name,
  start_time,
  end_time,
  is_overnight,
  break_minutes,
  required_role,
  color_hex
)
SELECT
  v.name,
  v.start_time,
  v.end_time,
  v.is_overnight,
  v.break_minutes,
  v.required_role,
  v.color_hex
FROM (
  VALUES
    ('Opening', TIME '06:00', TIME '14:00', FALSE, 30, 'Supervisor', '#10B981'),
    ('Morning', TIME '08:00', TIME '16:00', FALSE, 30, 'Cashier', '#0EA5E9'),
    ('Mid', TIME '10:00', TIME '18:00', FALSE, 30, 'Stock Associate', '#3B82F6'),
    ('Closing', TIME '14:00', TIME '22:00', FALSE, 30, 'Supervisor', '#8B5CF6'),
    ('Weekend Day', TIME '09:00', TIME '17:00', FALSE, 30, 'Barista', '#F59E0B')
) AS v(name, start_time, end_time, is_overnight, break_minutes, required_role, color_hex)
WHERE NOT EXISTS (
  SELECT 1
  FROM shifts s
  WHERE s.name = v.name
    AND s.start_time = v.start_time
    AND s.end_time = v.end_time
);

COMMIT;
