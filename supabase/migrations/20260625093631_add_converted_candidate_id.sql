-- ============================================================
-- Add converted_candidate_id to inquiries, mirroring converted_student_id.
-- An inquiry converts ONCE — to either a student OR a candidate.
-- ============================================================

ALTER TABLE inquiries
  ADD COLUMN converted_candidate_id uuid REFERENCES candidates(id);

CREATE INDEX idx_inquiries_converted_candidate ON inquiries(converted_candidate_id);