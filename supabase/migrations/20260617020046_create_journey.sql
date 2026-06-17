-- ============================================================
-- Visual Roadmap: journey stage definitions + per-student progress
-- ============================================================

-- Master list of journey stages (the roadmap template).
-- Owner/manager can edit these; they define the steps every student walks.
CREATE TABLE journey_stages (
  id            serial PRIMARY KEY,
  stage_order   int UNIQUE NOT NULL,    -- 1,2,3... controls display order
  name          text NOT NULL,          -- e.g. 'Profile Created','Destination Selected'
  description   text,
  icon          text,                   -- optional icon name for the UI
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- Per-student progress through the journey stages.
CREATE TABLE student_journey (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  stage_id      int NOT NULL REFERENCES journey_stages(id),
  state         text DEFAULT 'pending', -- 'pending','current','completed'
  completed_at  timestamptz,
  updated_by    uuid REFERENCES profiles(id),
  created_at    timestamptz DEFAULT now(),
  UNIQUE (student_id, stage_id)
);

CREATE INDEX idx_journey_student ON student_journey(student_id);
CREATE INDEX idx_journey_stage ON student_journey(stage_id);

-- Seed the default roadmap stages
INSERT INTO journey_stages (stage_order, name, description) VALUES
  (1, 'Inquiry Received',      'Initial contact / lead captured'),
  (2, 'Profile Created',       'Full student profile completed'),
  (3, 'Destination Selected',  'Country, institute, program & session chosen'),
  (4, 'Documents Collected',   'Required documents gathered and verified'),
  (5, 'Application Submitted',  'Application sent to the institute'),
  (6, 'Offer Received',        'Offer / admission letter received'),
  (7, 'Visa Processing',       'Visa application in progress'),
  (8, 'Enrolled',              'Student successfully enrolled / departed');

-- RLS: everyone sees the roadmap (your "visible to all connected persons" rule);
-- all staff add/edit; only owner+manager delete.
ALTER TABLE journey_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY jstages_select ON journey_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY jstages_insert ON journey_stages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY jstages_update ON journey_stages FOR UPDATE TO authenticated USING (true);
CREATE POLICY jstages_delete ON journey_stages FOR DELETE TO authenticated USING (can_delete());

ALTER TABLE student_journey ENABLE ROW LEVEL SECURITY;
CREATE POLICY sjourney_select ON student_journey FOR SELECT TO authenticated USING (true);
CREATE POLICY sjourney_insert ON student_journey FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY sjourney_update ON student_journey FOR UPDATE TO authenticated USING (true);
CREATE POLICY sjourney_delete ON student_journey FOR DELETE TO authenticated USING (can_delete());