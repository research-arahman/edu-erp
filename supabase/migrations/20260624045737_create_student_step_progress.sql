-- ============================================================
-- Student Step Progress
-- Per-student status against an admission_template step.
-- Makes the admission roadmap interactive (pending/current/done).
-- ============================================================

CREATE TABLE student_step_progress (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  step_id       uuid NOT NULL REFERENCES admission_steps(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending',  -- 'pending' | 'current' | 'done'
  note          text,
  updated_at    timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now(),
  CONSTRAINT valid_step_status CHECK (status IN ('pending', 'current', 'done')),
  UNIQUE (student_id, step_id)
);

CREATE INDEX idx_stepprog_student ON student_step_progress(student_id);
CREATE INDEX idx_stepprog_step ON student_step_progress(step_id);

-- RLS: same pattern as everything else — all staff view/add/edit; only owner+manager delete.
ALTER TABLE student_step_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY stepprog_select ON student_step_progress FOR SELECT TO authenticated USING (true);
CREATE POLICY stepprog_insert ON student_step_progress FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY stepprog_update ON student_step_progress FOR UPDATE TO authenticated USING (true);
CREATE POLICY stepprog_delete ON student_step_progress FOR DELETE TO authenticated USING (can_delete());