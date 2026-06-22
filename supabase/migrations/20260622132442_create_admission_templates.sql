-- ============================================================
-- Admission Process Templates
-- Reusable per (country + study level). Each template has ordered steps
-- with free-text timeframes. Programs inherit the matching template.
-- ============================================================

CREATE TABLE admission_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id    int NOT NULL REFERENCES countries(id),
  -- study level this template applies to; matches programs.level_category
  -- e.g. 'bachelors','masters','phd','diploma','jlpt','english'
  level_category text NOT NULL,
  name          text,                 -- optional friendly label, e.g. "Japan Master's (Research)"
  description   text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  -- one template per country+level (can relax later if you want variants)
  UNIQUE (country_id, level_category)
);

CREATE TABLE admission_steps (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   uuid NOT NULL REFERENCES admission_templates(id) ON DELETE CASCADE,
  step_order    int NOT NULL,         -- 1,2,3... display/sequence order
  title         text NOT NULL,        -- e.g. "Find a Professor (Lab)"
  description   text,                 -- the detail text for the step
  timeframe     text,                 -- FREE TEXT, e.g. "3 months before deadline"
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_admtpl_country ON admission_templates(country_id);
CREATE INDEX idx_admtpl_level ON admission_templates(level_category);
CREATE INDEX idx_admsteps_template ON admission_steps(template_id);
CREATE INDEX idx_admsteps_order ON admission_steps(template_id, step_order);

-- RLS: all staff view/add/edit; only owner+manager delete (same pattern as everything else)
ALTER TABLE admission_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY admtpl_select ON admission_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY admtpl_insert ON admission_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY admtpl_update ON admission_templates FOR UPDATE TO authenticated USING (true);
CREATE POLICY admtpl_delete ON admission_templates FOR DELETE TO authenticated USING (can_delete());

ALTER TABLE admission_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY admsteps_select ON admission_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY admsteps_insert ON admission_steps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY admsteps_update ON admission_steps FOR UPDATE TO authenticated USING (true);
CREATE POLICY admsteps_delete ON admission_steps FOR DELETE TO authenticated USING (can_delete());