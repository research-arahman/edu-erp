-- ============================================================
-- Job Applications: a candidate applying to a specific job
-- Employment pipeline, parallel to education `applications`.
-- ============================================================

-- Employment pipeline stages (parallel to app_stage on the education side)
CREATE TYPE job_stage AS ENUM (
  'applied',
  'screening',
  'interview',
  'offer',
  'coe_processing',     -- Certificate of Eligibility (Japan)
  'visa_processing',
  'placed'
);

CREATE TABLE job_applications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  candidate_id        uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id              uuid NOT NULL REFERENCES jobs(id),

  -- Pipeline position
  stage               job_stage DEFAULT 'applied',

  -- Outcome tracking
  status              text DEFAULT 'active', -- 'active','on_hold','withdrawn','rejected','accepted'

  -- Key dates
  applied_at          timestamptz DEFAULT now(),
  interview_at        timestamptz,
  offer_received_at   timestamptz,
  placed_at           timestamptz,
  decision_notes      text,

  -- Ownership
  assigned_to         uuid REFERENCES profiles(id),
  created_by          uuid REFERENCES profiles(id),

  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),

  CONSTRAINT valid_jobapp_status CHECK (status IN ('active','on_hold','withdrawn','rejected','accepted'))
);

-- Per-application requirement checklist (documents, tests, etc.)
CREATE TABLE job_application_checklist (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_application_id  uuid NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  requirement         text NOT NULL,
  is_fulfilled        boolean DEFAULT false,
  fulfilled_at        timestamptz,
  notes               text,
  sort_order          int DEFAULT 0,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_jobapp_candidate ON job_applications(candidate_id);
CREATE INDEX idx_jobapp_job ON job_applications(job_id);
CREATE INDEX idx_jobapp_stage ON job_applications(stage);
CREATE INDEX idx_jobchecklist_app ON job_application_checklist(job_application_id);

-- RLS: all staff view/add/edit; only owner+manager delete.
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY jobapp_select ON job_applications FOR SELECT TO authenticated USING (true);
CREATE POLICY jobapp_insert ON job_applications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY jobapp_update ON job_applications FOR UPDATE TO authenticated USING (true);
CREATE POLICY jobapp_delete ON job_applications FOR DELETE TO authenticated USING (can_delete());

ALTER TABLE job_application_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY jobcheck_select ON job_application_checklist FOR SELECT TO authenticated USING (true);
CREATE POLICY jobcheck_insert ON job_application_checklist FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY jobcheck_update ON job_application_checklist FOR UPDATE TO authenticated USING (true);
CREATE POLICY jobcheck_delete ON job_application_checklist FOR DELETE TO authenticated USING (can_delete());