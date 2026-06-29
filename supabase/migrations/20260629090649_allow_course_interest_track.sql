-- ============================================================
-- Allow 'course' as a valid interest_track on inquiries
-- (course lead funnel). The existing CHECK constraint
-- valid_interest_track permitted only education/employment.
-- Recreate it to also allow 'course'.
-- ============================================================

ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS valid_interest_track;

ALTER TABLE inquiries
  ADD CONSTRAINT valid_interest_track
  CHECK (interest_track IN ('education', 'employment', 'course'));