-- ============================================================
-- Applications: a student applying to a specific program
-- Moves through the app_stage pipeline; tracks requirement checklist
-- ============================================================

CREATE TABLE applications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  student_id          uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  program_id          uuid NOT NULL REFERENCES programs(id),
  session_id          uuid REFERENCES program_sessions(id),

  -- Pipeline position (uses the app_stage enum from Step 3)
  stage               app_stage DEFAULT 'inquiry',

  -- Outcome tracking
  status              text DEFAULT 'active',  -- 'active','on_hold','withdrawn','rejected','accepted'

  -- Key dates
  submitted_at        timestamptz,
  offer_received_at   timestamptz,
  decision_notes      text,

  -- Ownership
  assigned_to         uuid REFERENCES profiles(id),
  created_by          uuid REFERENCES profiles(id),

  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),

  CONSTRAINT valid_app_status CHECK (status IN ('active','on_hold','withdrawn','rejected','accepted'))
);

-- Per-application requirement checklist.
-- Seeded from the program's admission_requirements, then ticked off per student.
CREATE TABLE application_checklist (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id      uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  requirement         text NOT NULL,        -- copied from admission_requirements
  is_fulfilled        boolean DEFAULT false,
  fulfilled_at        timestamptz,
  notes               text,
  sort_order          int DEFAULT 0,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_applications_student ON applications(student_id);
CREATE INDEX idx_applications_program ON applications(program_id);
CREATE INDEX idx_applications_stage ON applications(stage);
CREATE INDEX idx_checklist_application ON application_checklist(application_id);

-- RLS: all staff view/add/edit, only owner+manager delete
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY applications_select ON applications FOR SELECT TO authenticated USING (true);
CREATE POLICY applications_insert ON applications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY applications_update ON applications FOR UPDATE TO authenticated USING (true);
CREATE POLICY applications_delete ON applications FOR DELETE TO authenticated USING (can_delete());

ALTER TABLE application_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY checklist_select ON application_checklist FOR SELECT TO authenticated USING (true);
CREATE POLICY checklist_insert ON application_checklist FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY checklist_update ON application_checklist FOR UPDATE TO authenticated USING (true);
CREATE POLICY checklist_delete ON application_checklist FOR DELETE TO authenticated USING (can_delete());