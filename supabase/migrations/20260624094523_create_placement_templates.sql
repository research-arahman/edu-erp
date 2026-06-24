-- ============================================================
-- Placement Process Templates (employment track)
-- Reusable per (country + industry/SSW field). Each template has ordered
-- steps with free-text timeframes. Mirrors admission_templates on the
-- education side, but keyed by country_id + industry_field_id.
-- ============================================================

CREATE TABLE placement_templates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id        int NOT NULL REFERENCES countries(id),
  industry_field_id int NOT NULL REFERENCES industry_fields(id),
  name              text,                 -- optional friendly label, e.g. "Japan Nursing Care (SSW)"
  description       text,
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  -- one template per country + industry (can relax later if variants are needed)
  UNIQUE (country_id, industry_field_id)
);

CREATE TABLE placement_steps (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   uuid NOT NULL REFERENCES placement_templates(id) ON DELETE CASCADE,
  step_order    int NOT NULL,         -- 1,2,3... display/sequence order
  title         text NOT NULL,        -- e.g. "Pass SSW Skills Test"
  description   text,
  timeframe     text,                 -- FREE TEXT, e.g. "before applying"
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_pltpl_country ON placement_templates(country_id);
CREATE INDEX idx_pltpl_industry ON placement_templates(industry_field_id);
CREATE INDEX idx_plsteps_template ON placement_steps(template_id);
CREATE INDEX idx_plsteps_order ON placement_steps(template_id, step_order);

-- RLS: same pattern as everything else — all staff view/add/edit; only owner+manager delete.
ALTER TABLE placement_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY pltpl_select ON placement_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY pltpl_insert ON placement_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY pltpl_update ON placement_templates FOR UPDATE TO authenticated USING (true);
CREATE POLICY pltpl_delete ON placement_templates FOR DELETE TO authenticated USING (can_delete());

ALTER TABLE placement_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY plsteps_select ON placement_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY plsteps_insert ON placement_steps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY plsteps_update ON placement_steps FOR UPDATE TO authenticated USING (true);
CREATE POLICY plsteps_delete ON placement_steps FOR DELETE TO authenticated USING (can_delete());