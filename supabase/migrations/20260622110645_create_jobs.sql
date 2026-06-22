-- ============================================================
-- Jobs / Positions: actual openings at an employer
-- Parallel to `programs`. Structured language + skills requirements.
-- ============================================================

CREATE TABLE jobs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id         uuid NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
  industry_field_id   int REFERENCES industry_fields(id),

  title               text NOT NULL,        -- e.g. 'Caregiver (SSW)', 'Food Production Staff'
  description         text,

  -- Employment terms
  employment_type     text,                 -- 'ssw','technical_intern','engineer','other'
  location            text,                 -- work location (city/prefecture)
  salary_min          numeric,
  salary_max          numeric,
  salary_currency     text DEFAULT 'JPY',
  salary_period       text DEFAULT 'monthly',-- 'monthly','yearly','hourly'

  -- Structured LANGUAGE requirement
  req_language_qual_id int REFERENCES qualification_types(id),  -- e.g. JLPT or JFT-Basic
  req_language_level   text,                                    -- e.g. 'N4','A2'

  -- Structured SKILLS requirement
  req_skills_qual_id   int REFERENCES qualification_types(id),  -- e.g. SSW Skills Test
  req_skills_detail    text,                                    -- field-specific note

  -- Other requirements
  min_experience_years int,
  age_min             int,
  age_max             int,
  other_requirements  text,

  -- Intake / start period
  start_period        text,                 -- e.g. 'April 2027', 'Immediate', 'Rolling'
  positions_available int,

  is_open             boolean DEFAULT true,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_jobs_employer ON jobs(employer_id);
CREATE INDEX idx_jobs_industry ON jobs(industry_field_id);
CREATE INDEX idx_jobs_open ON jobs(is_open);

-- RLS: all staff view/add/edit; only owner+manager delete.
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY jobs_select ON jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY jobs_insert ON jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY jobs_update ON jobs FOR UPDATE TO authenticated USING (true);
CREATE POLICY jobs_delete ON jobs FOR DELETE TO authenticated USING (can_delete());