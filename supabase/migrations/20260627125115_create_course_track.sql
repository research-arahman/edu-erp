-- ============================================================
-- LANGUAGE / TEST-PREP COURSE TRACK (foundation)
-- Separate entity from students/candidates. Supports MULTIPLE
-- courses per student via course_enrollments. Batches, instructors,
-- and fee->accounting auto-posting come in later chunks.
-- ============================================================

-- ---------- COURSES (catalog) ----------
CREATE TABLE courses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,                 -- e.g. 'JLPT N5', 'IELTS', 'GRE'
  description   text,
  default_fee   numeric DEFAULT 0,             -- standard fee in BDT (float-style numeric)
  currency      text DEFAULT 'BDT',
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- ---------- COURSE STUDENTS (the person; lean demographics) ----------
CREATE TABLE course_students (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     text NOT NULL,
  phone         text,
  email         text,
  date_of_birth date,
  gender        text,
  address       text,
  status        text DEFAULT 'active',         -- 'active' | 'completed' | 'dropped'
  referred_by_partner_id uuid REFERENCES referral_partners(id) ON DELETE SET NULL,

  -- Conversion links (used later: a course student can become an abroad student/candidate)
  converted_student_id   uuid REFERENCES students(id)   ON DELETE SET NULL,
  converted_candidate_id uuid REFERENCES candidates(id) ON DELETE SET NULL,

  notes         text,
  created_at    timestamptz DEFAULT now()
);

-- ---------- COURSE ENROLLMENTS (student x course; fee per enrollment) ----------
CREATE TABLE course_enrollments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_student_id uuid NOT NULL REFERENCES course_students(id) ON DELETE CASCADE,
  course_id         uuid NOT NULL REFERENCES courses(id),
  agreed_fee        numeric DEFAULT 0,         -- actual fee for THIS student (defaults from course.default_fee, adjustable)
  currency          text DEFAULT 'BDT',
  enrollment_date   date DEFAULT current_date,
  status            text DEFAULT 'enrolled',   -- 'enrolled' | 'active' | 'completed' | 'dropped'
  -- fee->accounting link (used in the NEXT chunk, like service_fees.posted_transaction_id)
  posted_transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  payment_status    text DEFAULT 'pending',    -- 'pending' | 'partial' | 'paid' (per-enrollment payment state)
  notes             text,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX idx_course_enroll_student ON course_enrollments(course_student_id);
CREATE INDEX idx_course_enroll_course  ON course_enrollments(course_id);
CREATE INDEX idx_course_students_partner ON course_students(referred_by_partner_id);

-- Seed a few common courses to start (you can edit/add via the UI)
INSERT INTO courses (name, description, default_fee) VALUES
  ('JLPT N5', 'Japanese Language Proficiency Test - N5 preparation', 15000),
  ('JFT-Basic', 'Japan Foundation Test for Basic Japanese', 12000),
  ('IELTS', 'IELTS preparation course', 18000);