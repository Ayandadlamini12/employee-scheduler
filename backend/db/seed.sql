BEGIN;

-- Seed employees (upsert by unique email).
INSERT INTO employees (
  employee_code,
  first_name,
  last_name,
  english_name,
  chinese_name,
  preferred_language,
  email,
  phone,
  role_title,
  employment_type,
  status,
  hired_on
)
VALUES
  ('EMP-1001', 'Olivia', 'Martin', 'Olivia Martin', '王莉維亞', 'en', 'olivia.martin@example.com', '+1-555-0101', 'Supervisor', 'full_time', 'active', '2024-02-12'),
  ('EMP-1002', 'Ethan', 'Clark', 'Ethan Clark', '克拉克', 'en', 'ethan.clark@example.com', '+1-555-0102', 'Cashier', 'part_time', 'active', '2024-03-05'),
  ('EMP-1003', 'Mia', 'Johnson', 'Mia Johnson', '米婭', 'zh-TW', 'mia.johnson@example.com', '+1-555-0103', 'Stock Associate', 'part_time', 'active', '2024-04-17'),
  ('EMP-1004', 'Noah', 'Williams', 'Noah Williams', '諾亞', 'zh-TW', 'noah.williams@example.com', '+1-555-0104', 'Barista', 'part_time', 'active', '2024-05-03'),
  ('EMP-1005', 'Sophia', 'Davis', 'Sophia Davis', '蘇菲亞', 'en', 'sophia.davis@example.com', '+1-555-0105', 'Assistant Manager', 'full_time', 'active', '2023-11-20')
ON CONFLICT (email) DO UPDATE
SET
  employee_code = EXCLUDED.employee_code,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  english_name = EXCLUDED.english_name,
  chinese_name = EXCLUDED.chinese_name,
  preferred_language = EXCLUDED.preferred_language,
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
