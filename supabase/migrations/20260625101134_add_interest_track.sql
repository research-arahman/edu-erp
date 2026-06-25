-- ============================================================
-- Add interest_track to inquiries: which track the lead is interested in.
-- Separate from interest_level (which stays education-only via prog_level enum).
-- Helps staff pick the right conversion (student vs candidate).
-- ============================================================

ALTER TABLE inquiries
  ADD COLUMN interest_track text;  -- 'education' | 'employment'

ALTER TABLE inquiries
  ADD CONSTRAINT valid_interest_track
  CHECK (interest_track IN ('education', 'employment') OR interest_track IS NULL);