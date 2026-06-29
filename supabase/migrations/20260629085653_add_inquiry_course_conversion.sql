-- ============================================================
-- Course lead funnel: allow an inquiry (interest_track='course')
-- to convert into a course_student. interest_track is free text
-- (no enum), so 'course' needs no schema change — only the
-- conversion link column is added here, mirroring
-- converted_student_id / converted_candidate_id.
-- ============================================================

ALTER TABLE inquiries
  ADD COLUMN converted_course_student_id uuid REFERENCES course_students(id) ON DELETE SET NULL;