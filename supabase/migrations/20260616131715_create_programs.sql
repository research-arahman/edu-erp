-- ============================================================
-- Core CRM Tables (Part 2): Programs, Sessions, Requirements
-- ============================================================

-- A program = one offering at an institute.
-- This single table serves BOTH paths:
--   Language path: level_category='jlpt'/'english'/etc, level_label='N5'/'IELTS Prep'
--   University path: level_category='bachelors'/'masters'/'phd', with department + course_name
CREATE TABLE programs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id      uuid NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,

  -- Level classification (data-driven, country-specific)
  level_category    text NOT NULL,   -- 'jlpt','english','topik','bachelors','masters','phd','diploma'
  level_label       text,            -- 'N5','N4','IELTS Prep','Foundation', etc.

  -- University-specific (null for language schools)
  department        text,            -- e.g. 'Graduate School of Engineering'
  course_name       text,            -- e.g. 'MSc Computer Science'

  -- Costs
  tuition_fee       numeric,
  admission_cost    numeric,
  enrollment_cost   numeric,
  currency          text DEFAULT 'USD',

  duration_months   int,
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

-- Intake sessions per program (April intake, October intake, etc.)
CREATE TABLE program_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id    uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  session_name  text NOT NULL,       -- e.g. 'April 2027 Intake'
  start_date    date,
  application_deadline date,
  seats         int,
  is_open       boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- Admission requirement checklist items per program
CREATE TABLE admission_requirements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id    uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  requirement   text NOT NULL,       -- e.g. 'Passport copy', 'Bank statement (6 months)'
  is_mandatory  boolean DEFAULT true,
  sort_order    int DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

-- Indexes for the selector chain
CREATE INDEX idx_programs_institute ON programs(institute_id);
CREATE INDEX idx_programs_level_cat ON programs(level_category);
CREATE INDEX idx_sessions_program ON program_sessions(program_id);
CREATE INDEX idx_requirements_program ON admission_requirements(program_id);