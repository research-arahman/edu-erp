-- ============================================================
-- Multi-roadmap support: a course student can follow MULTIPLE
-- roadmaps in parallel (e.g. their JLPT N5 course-prep roadmap
-- AND the Japan Language School admission roadmap), each tracked
-- independently. Replaces the single course_students.roadmap_template_id
-- with a many-to-many link table. Per-step progress
-- (course_student_step_progress) needs no change — it already keys
-- on (course_student_id, step_id) regardless of how many roadmaps.
-- ============================================================

-- ---------- LINK TABLE (course student ↔ roadmap template) ----------
CREATE TABLE course_student_roadmaps (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_student_id uuid NOT NULL REFERENCES course_students(id) ON DELETE CASCADE,
  template_id       uuid NOT NULL REFERENCES course_roadmap_templates(id) ON DELETE CASCADE,
  created_at        timestamptz DEFAULT now(),
  UNIQUE (course_student_id, template_id)
);

CREATE INDEX idx_course_student_roadmaps_student ON course_student_roadmaps(course_student_id);

-- Migrate any existing single-roadmap assignments into the link table.
INSERT INTO course_student_roadmaps (course_student_id, template_id)
SELECT id, roadmap_template_id
FROM course_students
WHERE roadmap_template_id IS NOT NULL
ON CONFLICT (course_student_id, template_id) DO NOTHING;

-- (Keep course_students.roadmap_template_id column for now to avoid breaking
--  existing code; it becomes unused once the backend switches to the link table.
--  We can drop it in a later cleanup migration.)

-- ============================================================
-- SEED: JLPT N5 Course Preparation (Minna no Nihongo I based)
-- Reflects standard Bangladesh agency practice. Owner can edit freely.
-- ============================================================
WITH t AS (
  INSERT INTO course_roadmap_templates (name, description, category)
  VALUES (
    'JLPT N5 Course Preparation (Minna no Nihongo I)',
    'Course-prep roadmap for JLPT N5 using Minna no Nihongo I as the core textbook, with Bangla grammar notes, Basic Kanji Book, and mock/official practice workbooks. Editable.',
    'jlpt_n5_prep'
  )
  RETURNING id
)
INSERT INTO course_roadmap_steps (template_id, step_order, title, description)
SELECT t.id, v.step_order, v.title, v.description FROM t, (VALUES
  (1,  'Orientation & course materials issued', 'Issue Minna no Nihongo I, Bangla grammar notes, and supplementary materials (Basic Kanji Book, mock workbooks). Explain course plan and target exam date.'),
  (2,  'Hiragana mastery', 'Read and write all Hiragana confidently.'),
  (3,  'Katakana mastery', 'Read and write all Katakana confidently.'),
  (4,  'Minna no Nihongo I — Lessons 1–5', 'Greetings, basic sentence structure (です/ます), particles は・の, basic vocabulary.'),
  (5,  'Minna no Nihongo I — Lessons 6–10', 'Verbs and basic actions, particles を・で・に, existence (あります/います).'),
  (6,  'Minna no Nihongo I — Lessons 11–15', 'Counters, adjectives (い/な), te-form introduction, requests.'),
  (7,  'Minna no Nihongo I — Lessons 16–20', 'Te-form usage, connecting sentences, plain form introduction, comparisons.'),
  (8,  'Minna no Nihongo I — Lessons 21–25', 'Plain form, casual expressions, completing the textbook.'),
  (9,  'N5 Kanji (~100) — Basic Kanji Book', 'Cover the ~100 required N5 Kanji using Basic Kanji Book / Kanji Look and Learn.'),
  (10, 'Core vocabulary milestone (~800 N5 words)', 'Reach the N5 vocabulary target (~800 words).'),
  (11, 'Grammar review', 'Consolidate particles, verb forms, adjectives, and key N5 sentence patterns.'),
  (12, 'Listening practice milestone', 'Regular N5 listening drills; reach target comprehension.'),
  (13, 'Mock test 1 (Shin Nihongo 500 Mon / practice)', 'First full mock test to gauge level.'),
  (14, 'Mock test 2 — pass threshold', 'Second mock test using JLPT Official Practice Workbook; achieve passing threshold.'),
  (15, 'JLPT N5 exam registration', 'Register the student for the JLPT/NAT-TEST N5 exam.'),
  (16, 'Final readiness review', 'Final review session; confirm exam-day logistics and readiness.')
) AS v(step_order, title, description);