-- ============================================================
-- BATCHES: a scheduled run of a course (e.g. "JLPT N5 — April 2026").
-- A batch belongs to ONE course. Course students join a batch via
-- course_enrollments.batch_id (an enrollment is assigned to a batch
-- of its course). The batch roster = enrollments with that batch_id.
-- Instructor is deferred to the next chunk (instructor_id added later).
-- ============================================================

CREATE TABLE batches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid NOT NULL REFERENCES courses(id),
  name        text NOT NULL,                 -- e.g. 'April 2026 N5 Batch'
  start_date  date,
  end_date    date,
  status      text DEFAULT 'planned',        -- 'planned' | 'running' | 'completed' | 'cancelled'
  notes       text,
  created_at  timestamptz DEFAULT now()
);

-- Assign an enrollment to a batch (optional). ON DELETE SET NULL so
-- deleting a batch un-assigns its enrollments without deleting them.
ALTER TABLE course_enrollments
  ADD COLUMN batch_id uuid REFERENCES batches(id) ON DELETE SET NULL;

CREATE INDEX idx_batches_course ON batches(course_id);
CREATE INDEX idx_course_enroll_batch ON course_enrollments(batch_id);