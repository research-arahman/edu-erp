-- ============================================================
-- Candidate Step Progress (employment track)
-- Per-candidate status against a placement_template step.
-- Mirrors student_step_progress on the education side.
-- ============================================================

CREATE TABLE candidate_step_progress (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id  uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  step_id       uuid NOT NULL REFERENCES placement_steps(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending',  -- 'pending' | 'current' | 'done'
  note          text,
  updated_at    timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now(),
  CONSTRAINT valid_cand_step_status CHECK (status IN ('pending', 'current', 'done')),
  UNIQUE (candidate_id, step_id)
);

CREATE INDEX idx_candstepprog_candidate ON candidate_step_progress(candidate_id);
CREATE INDEX idx_candstepprog_step ON candidate_step_progress(step_id);

-- RLS: same pattern — all staff view/add/edit; only owner+manager delete.
ALTER TABLE candidate_step_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY candstepprog_select ON candidate_step_progress FOR SELECT TO authenticated USING (true);
CREATE POLICY candstepprog_insert ON candidate_step_progress FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY candstepprog_update ON candidate_step_progress FOR UPDATE TO authenticated USING (true);
CREATE POLICY candstepprog_delete ON candidate_step_progress FOR DELETE TO authenticated USING (can_delete());