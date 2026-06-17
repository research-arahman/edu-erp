-- ============================================================
-- Inquiry Tracker: lead pipeline before full student conversion
-- ============================================================

CREATE TABLE inquiries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who the lead is (lightweight — before a full student profile exists)
  name                text NOT NULL,
  phone               text,
  email               text,

  -- Where the lead came from
  source              text,         -- 'facebook','walk_in','referral','website','other'

  -- What they're interested in (early intent, before full destination selection)
  interest_country_id int REFERENCES countries(id),
  interest_level      prog_level,   -- 'bachelors','masters','phd','language'

  -- Pipeline status
  status              text DEFAULT 'new',  -- 'new','contacted','qualified','converted','lost'

  -- Follow-up management
  follow_up_date      date,
  notes               text,

  -- If converted, link to the created student record
  converted_student_id uuid REFERENCES students(id),

  -- Ownership
  assigned_to         uuid REFERENCES profiles(id),
  created_by          uuid REFERENCES profiles(id),

  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),

  CONSTRAINT valid_status CHECK (status IN ('new','contacted','qualified','converted','lost'))
);

CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_assigned ON inquiries(assigned_to);
CREATE INDEX idx_inquiries_followup ON inquiries(follow_up_date);

-- RLS: same pattern — all staff view/add/edit, only owner+manager delete
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY inquiries_select ON inquiries FOR SELECT TO authenticated USING (true);
CREATE POLICY inquiries_insert ON inquiries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY inquiries_update ON inquiries FOR UPDATE TO authenticated USING (true);
CREATE POLICY inquiries_delete ON inquiries FOR DELETE TO authenticated USING (can_delete());