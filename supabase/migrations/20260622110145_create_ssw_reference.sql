-- ============================================================
-- SSW Reference Data: industry fields + qualification/test types
-- Foundation for the job-placement (employment) track.
-- ============================================================

-- Japan's SSW designated industry fields (also reusable for other countries' sectors)
CREATE TABLE industry_fields (
  id            serial PRIMARY KEY,
  name          text NOT NULL,
  country_id    int REFERENCES countries(id),   -- which country this field applies to (Japan for SSW)
  category_code text,                            -- optional short code
  is_ssw        boolean DEFAULT false,           -- true = official Japan SSW field
  description   text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- Qualification / test types (language tests, skills tests)
CREATE TABLE qualification_types (
  id            serial PRIMARY KEY,
  name          text NOT NULL,                   -- e.g. 'JLPT','JFT-Basic','SSW Skills Test'
  category      text NOT NULL,                   -- 'language' | 'skills'
  country_id    int REFERENCES countries(id),
  -- For skills tests tied to a specific industry field:
  industry_field_id int REFERENCES industry_fields(id),
  levels        text[],                          -- e.g. for JLPT: {'N5','N4','N3','N2','N1'}
  description   text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  CONSTRAINT valid_qual_category CHECK (category IN ('language','skills'))
);

CREATE INDEX idx_industry_country ON industry_fields(country_id);
CREATE INDEX idx_qual_country ON qualification_types(country_id);
CREATE INDEX idx_qual_field ON qualification_types(industry_field_id);

-- ============================================================
-- Seed: Japan's 16 SSW designated industry fields
-- (country_id will be set after we confirm Japan's id = 1, which it is)
-- ============================================================
INSERT INTO industry_fields (name, country_id, is_ssw, description) VALUES
  ('Nursing Care',                         1, true, 'Caregiving / kaigo'),
  ('Building Cleaning Management',         1, true, NULL),
  ('Manufacturing of Industrial Products', 1, true, 'Machine parts, industrial machinery, electric/electronics'),
  ('Construction',                         1, true, NULL),
  ('Shipbuilding & Ship Machinery',        1, true, NULL),
  ('Automobile Repair & Maintenance',      1, true, NULL),
  ('Aviation',                             1, true, 'Airport ground handling, aircraft maintenance'),
  ('Accommodation',                        1, true, 'Hotel / ryokan'),
  ('Agriculture',                          1, true, NULL),
  ('Fishery & Aquaculture',                1, true, NULL),
  ('Manufacture of Food & Beverages',      1, true, NULL),
  ('Food Service Industry',                1, true, 'Restaurants'),
  ('Automobile Transportation',            1, true, 'Bus/taxi/truck driving (newer field)'),
  ('Railway',                              1, true, NULL),
  ('Forestry',                             1, true, NULL),
  ('Wood Industry',                        1, true, NULL);

-- Seed: core qualification/test types for Japan SSW
INSERT INTO qualification_types (name, category, country_id, levels, description) VALUES
  ('JLPT',      'language', 1, ARRAY['N5','N4','N3','N2','N1'], 'Japanese-Language Proficiency Test'),
  ('JFT-Basic', 'language', 1, ARRAY['A2'],                     'Japan Foundation Test for Basic Japanese (A2 level)'),
  ('SSW Skills Test', 'skills', 1, NULL,                        'Prometric skills test, varies per industry field');

-- ============================================================
-- RLS: reference data — all staff view/add/edit; owner+manager delete.
-- ============================================================
ALTER TABLE industry_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY ifields_select ON industry_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY ifields_insert ON industry_fields FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY ifields_update ON industry_fields FOR UPDATE TO authenticated USING (true);
CREATE POLICY ifields_delete ON industry_fields FOR DELETE TO authenticated USING (can_delete());

ALTER TABLE qualification_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY qual_select ON qualification_types FOR SELECT TO authenticated USING (true);
CREATE POLICY qual_insert ON qualification_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY qual_update ON qualification_types FOR UPDATE TO authenticated USING (true);
CREATE POLICY qual_delete ON qualification_types FOR DELETE TO authenticated USING (can_delete());