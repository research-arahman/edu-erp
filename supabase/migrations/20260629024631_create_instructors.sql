-- ============================================================
-- CONTRACT INSTRUCTORS (standalone entity — NOT auth users/profiles).
-- Hired per course/batch. Instructor PAYMENTS post to accounting as an
-- EXPENSE (account 5100 Freelance/External Consultant Fees), mirroring
-- the course-payment revenue pattern. Reversal on delete is handled in
-- Python via the service-role client (NOT a DB trigger — RLS silently
-- blocks trigger-context deletes on the transactions table).
-- ============================================================

-- ---------- INSTRUCTORS ----------
CREATE TABLE instructors (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name      text NOT NULL,
  phone          text,
  email          text,
  specialization text,                  -- e.g. 'JLPT N5', 'IELTS'
  rate_note      text,                  -- free-text agreed rate (e.g. '2000 BDT/class')
  is_active      boolean DEFAULT true,
  notes          text,
  created_at     timestamptz DEFAULT now()
);

-- Assign an instructor to a batch (the deferred batch.instructor_id).
ALTER TABLE batches
  ADD COLUMN instructor_id uuid REFERENCES instructors(id) ON DELETE SET NULL;

-- ---------- INSTRUCTOR PAYMENTS ----------
-- Each payment auto-posts an EXPENSE transaction (account 5100).
CREATE TABLE instructor_payments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id         uuid NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  batch_id              uuid REFERENCES batches(id) ON DELETE SET NULL,   -- optional: which batch this pays for
  amount                numeric NOT NULL CHECK (amount >= 0),
  currency              text DEFAULT 'BDT',
  payment_date          date NOT NULL DEFAULT current_date,
  payment_method        text,
  reference             text,
  notes                 text,
  posted_transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  recorded_by           uuid REFERENCES profiles(id),
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX idx_instructor_payments_instructor ON instructor_payments(instructor_id);
CREATE INDEX idx_instructor_payments_batch ON instructor_payments(batch_id);
CREATE INDEX idx_instructor_payments_posted_txn ON instructor_payments(posted_transaction_id);
CREATE INDEX idx_batches_instructor ON batches(instructor_id);