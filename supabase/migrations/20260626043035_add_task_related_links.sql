-- ============================================================
-- Link an assigned task to a related student or candidate (optional).
-- A task can be "about" a student OR a candidate (or neither).
-- ON DELETE SET NULL: deleting the person clears the link but keeps the task.
-- ============================================================

ALTER TABLE tasks
  ADD COLUMN related_student_id   uuid REFERENCES students(id)   ON DELETE SET NULL,
  ADD COLUMN related_candidate_id uuid REFERENCES candidates(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_related_student   ON tasks(related_student_id);
CREATE INDEX idx_tasks_related_candidate ON tasks(related_candidate_id);