-- ============================================================
-- Core CRM Tables (Part 3): Students
-- ============================================================

CREATE TABLE students (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic identity
  full_name           text NOT NULL,
  date_of_birth       date,
  gender              text,
  nationality         text DEFAULT 'Bangladeshi',
  email               text,
  phone               text,
  address             text,
  photo_drive_id      text,                 -- Google Drive file id for profile photo

  -- Passport information
  passport_number     text,
  passport_issue_date date,
  passport_expiry     date,
  passport_country    text,

  -- Financial / income information
  annual_income       numeric,
  income_currency     text,
  income_source       text,                 -- e.g. 'Business', 'Service'

  -- Supporter / sponsor information
  supporter_name      text,
  supporter_relation  text,                 -- e.g. 'Father', 'Uncle'
  supporter_occupation text,
  supporter_income    numeric,
  supporter_currency  text,

  -- Academic & career background (free text / summary; detailed history can be a child table later)
  highest_qualification text,
  academic_summary    text,
  career_summary      text,

  -- Purpose & target destination
  purpose             text,                 -- why they want to study abroad
  target_country_id   int REFERENCES countries(id),
  target_institute_id uuid REFERENCES institutes(id),
  target_program_id   uuid REFERENCES programs(id),
  target_session_id   uuid REFERENCES program_sessions(id),

  -- Internal management
  assigned_counselor  uuid REFERENCES auth.users(id),
  drive_folder_id     text,                 -- root Drive folder for this student's documents
  status              text DEFAULT 'active',-- 'active' | 'archived' | 'enrolled' | 'dropped'

  created_by          uuid REFERENCES auth.users(id),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_students_counselor ON students(assigned_counselor);
CREATE INDEX idx_students_target_country ON students(target_country_id);
CREATE INDEX idx_students_status ON students(status);