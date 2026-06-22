-- ============================================================
-- Candidates: job-seeker profile for the employment track
-- Parallel to `students`. Shares infrastructure (profiles, docs, tasks).
-- ============================================================

CREATE TABLE candidates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic identity
  full_name           text NOT NULL,
  date_of_birth       date,
  gender              text,
  nationality         text DEFAULT 'Bangladeshi',
  email               text,
  phone               text,
  address             text,
  photo_drive_id      text,

  -- Passport information
  passport_number     text,
  passport_issue_date date,
  passport_expiry     date,
  passport_country    text,

  -- Financial / income (for visa/COE proof where relevant)
  annual_income       numeric,
  income_currency     text,
  income_source       text,

  -- Work background
  highest_qualification text,
  total_experience_years int,
  work_history        text,                 -- summary; detailed entries can be a child table later
  current_occupation  text,

  -- Language proficiency (structured)
  language_qual_id    int REFERENCES qualification_types(id),  -- e.g. JLPT / JFT-Basic
  language_level      text,                                    -- e.g. 'N4','A2'
  -- Skills test held (if any)
  skills_qual_id      int REFERENCES qualification_types(id),
  skills_detail       text,

  -- Purpose & target chain (Country → Industry → Employer → Job → start period)
  purpose             text,
  target_country_id   int REFERENCES countries(id),
  target_industry_id  int REFERENCES industry_fields(id),
  target_employer_id  uuid REFERENCES employers(id),
  target_job_id       uuid REFERENCES jobs(id),
  target_start_period text,

  -- Internal management
  assigned_counselor  uuid REFERENCES auth.users(id),
  drive_folder_id     text,
  status              text DEFAULT 'active', -- 'active','archived','placed','dropped'

  created_by          uuid REFERENCES auth.users(id),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_candidates_counselor ON candidates(assigned_counselor);
CREATE INDEX idx_candidates_target_country ON candidates(target_country_id);
CREATE INDEX idx_candidates_target_industry ON candidates(target_industry_id);
CREATE INDEX idx_candidates_status ON candidates(status);

-- RLS: all staff view/add/edit; only owner+manager delete.
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY candidates_select ON candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY candidates_insert ON candidates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY candidates_update ON candidates FOR UPDATE TO authenticated USING (true);
CREATE POLICY candidates_delete ON candidates FOR DELETE TO authenticated USING (can_delete());