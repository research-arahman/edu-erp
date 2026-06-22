-- ============================================================
-- Employers: company database for the job-placement track
-- Parallel to `institutes` on the education side.
-- ============================================================

CREATE TABLE employers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id          int NOT NULL REFERENCES countries(id),
  name                text NOT NULL,

  -- Primary industry (links to SSW / industry reference data)
  industry_field_id   int REFERENCES industry_fields(id),

  -- Company details
  city                text,
  address             text,
  company_size        text,                 -- e.g. 'small','medium','large'
  website             text,

  -- SSW / hiring specifics
  is_ssw_registered   boolean DEFAULT false,-- registered to accept SSW workers
  accepts_foreign     boolean DEFAULT true,

  -- Side-panel info (mirrors institute's living-expense/services idea)
  housing_support     boolean DEFAULT false,-- provides/arranges accommodation
  support_services    text,                 -- free text: airport pickup, training, etc.

  -- Contact person
  contact_name        text,
  contact_email       text,
  contact_phone       text,

  notes               text,
  is_active           boolean DEFAULT true,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_employers_country ON employers(country_id);
CREATE INDEX idx_employers_industry ON employers(industry_field_id);

-- RLS: all staff view/add/edit; only owner+manager delete.
ALTER TABLE employers ENABLE ROW LEVEL SECURITY;
CREATE POLICY employers_select ON employers FOR SELECT TO authenticated USING (true);
CREATE POLICY employers_insert ON employers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY employers_update ON employers FOR UPDATE TO authenticated USING (true);
CREATE POLICY employers_delete ON employers FOR DELETE TO authenticated USING (can_delete());