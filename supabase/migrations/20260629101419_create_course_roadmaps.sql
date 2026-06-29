-- ============================================================
-- COURSE ROADMAP TEMPLATES + STEPS + per-course-student PROGRESS
-- Mirrors the admission_templates / admission_steps / student_step_progress
-- pattern, but for the course track. Seeds the Japan Language School
-- 4-phase workflow as granular sub-steps.
-- ============================================================

-- ---------- TEMPLATES ----------
CREATE TABLE course_roadmap_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  category    text,                 -- free-text, optional (e.g. 'japan_language_school')
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ---------- STEPS ----------
CREATE TABLE course_roadmap_steps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES course_roadmap_templates(id) ON DELETE CASCADE,
  step_order  int NOT NULL,
  title       text NOT NULL,
  description text,
  created_at  timestamptz DEFAULT now()
);

-- ---------- PER-COURSE-STUDENT PROGRESS ----------
CREATE TABLE course_student_step_progress (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_student_id uuid NOT NULL REFERENCES course_students(id) ON DELETE CASCADE,
  step_id           uuid NOT NULL REFERENCES course_roadmap_steps(id) ON DELETE CASCADE,
  status            text DEFAULT 'pending',   -- 'pending' | 'in_progress' | 'done'
  note              text,
  updated_at        timestamptz DEFAULT now(),
  UNIQUE (course_student_id, step_id)
);

-- Which roadmap a course student is following (optional).
ALTER TABLE course_students
  ADD COLUMN roadmap_template_id uuid REFERENCES course_roadmap_templates(id) ON DELETE SET NULL;

CREATE INDEX idx_course_roadmap_steps_template ON course_roadmap_steps(template_id);
CREATE INDEX idx_course_step_progress_student ON course_student_step_progress(course_student_id);

-- ============================================================
-- SEED: Japan Language School Admission roadmap (granular sub-steps)
-- ============================================================
WITH t AS (
  INSERT INTO course_roadmap_templates (name, description, category)
  VALUES (
    'Japan Language School Admission',
    'Agency workflow to admit a Bangladeshi student to a Japanese language school (~6 months before arrival): screening, school application, COE documentation, and COE/visa processing.',
    'japan_language_school'
  )
  RETURNING id
)
INSERT INTO course_roadmap_steps (template_id, step_order, title, description)
SELECT t.id, v.step_order, v.title, v.description FROM t, (VALUES
  -- PHASE 1: Screening & Pre-Qualification
  (1,  'Phase 1: Verify education history (12+ years)', 'Confirm HSC or equivalent (12+ years). Check study gap — ideally under 5 years; if there is a gap, collect proof of activities (e.g. job experience certificates).'),
  (2,  'Phase 1: Verify Japanese language ability', 'Certificate of at least 150 hours of study OR a pass at JLPT N5 / NAT-TEST Level 5. The school often conducts a Skype/Zoom interview — do not submit a student who cannot introduce themselves in Japanese.'),
  (3,  'Phase 1: Financial sponsor check', 'Confirm a sponsor (usually a parent) who can show ~15–20 Lakh BDT (~1.5–2 million JPY) that is liquid and stable (not just deposited).'),
  -- PHASE 2: School Selection & Application (5-6 months before departure)
  (4,  'Phase 2: Confirm school partnership / agent registration', 'Have a partnership or register as an agent with the Japanese school''s Overseas Admissions department.'),
  (5,  'Phase 2: Select intake session & confirm deadline', 'April intake → apply Oct/Nov; July → Feb/Mar; October → Apr/May; January → Aug/Sep.'),
  (6,  'Phase 2: Submit Application for Admission', 'Complete the school''s application form on the student''s behalf.'),
  (7,  'Phase 2: Prepare student for school interview', 'School schedules a video interview. Practice basic Q&A (why Japan, who is the sponsor).'),
  -- PHASE 3: COE Documentation
  (8,  'Phase 3: Student docs — passport', 'Original passport with at least 6 months validity.'),
  (9,  'Phase 3: Student docs — academic certificates', 'All academic certificates & marksheets (SSC, HSC, Bachelor''s).'),
  (10, 'Phase 3: Student docs — Japanese language certificate', '150-hour completion certificate OR JLPT/NAT pass certificate.'),
  (11, 'Phase 3: Student docs — birth certificate & photos', 'English birth certificate; photos 3cm x 4cm, white background.'),
  (12, 'Phase 3: Sponsor docs — bank solvency certificate', 'Bank solvency certificate showing ~2 million JPY (~18–20 Lakh BDT).'),
  (13, 'Phase 3: Sponsor docs — bank statement (6–12 months)', 'Detailed bank statement for the last 6–12 months. Large, sudden deposits are a red flag for immigration.'),
  (14, 'Phase 3: Sponsor docs — proof of income', 'Trade license (business owner), salary certificate (employee), or 3 years tax return (TIN).'),
  (15, 'Phase 3: Sponsor docs — relationship proof', 'Nikahnama / parents'' marriage deed, and Family Tree Certificate (City Corporation / Union Parishad).'),
  (16, 'Phase 3: Translate, scan & submit to school', 'Notarized English/Japanese translation of Bengali documents; scan clearly; send the digital package to the school, which submits to Immigration as proxy.'),
  -- PHASE 4: COE Issuance & Visa Processing
  (17, 'Phase 4: Receive COE result', 'Processing takes 2–3 months; the school notifies COE issued or rejected.'),
  (18, 'Phase 4: Tuition payment', 'On COE approval, instruct student/sponsor to SWIFT-transfer ~700,000–800,000 JPY first-year tuition to the school.'),
  (19, 'Phase 4: Receive original COE & admission letter', 'School mails the original COE + admission letter via DHL/EMS/FedEx.'),
  (20, 'Phase 4: Visa application at Embassy of Japan (Dhaka)', 'Submit passport, visa form, original COE, photo, cover letter. Embassy may interview the student in Japanese.'),
  (21, 'Phase 4: Visa issuance & departure', 'After the visa is pasted (~1 week), book the flight and inform the school of the arrival date for airport pickup.')
) AS v(step_order, title, description);