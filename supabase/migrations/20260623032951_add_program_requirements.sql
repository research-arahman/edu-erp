-- ============================================================
-- Add requirement fields to programs
-- Language test accepted, minimum level, and MOI acceptance.
-- ============================================================

ALTER TABLE programs
  ADD COLUMN language_test_accepted text,   -- e.g. 'IELTS','TOEFL','JLPT','Duolingo','Any','None'
  ADD COLUMN min_language_level     text,   -- e.g. 'IELTS 6.5','N2','TOEFL 80' (free text — varies)
  ADD COLUMN moi_accepted           boolean DEFAULT false;  -- Medium of Instruction letter accepted in lieu of a test