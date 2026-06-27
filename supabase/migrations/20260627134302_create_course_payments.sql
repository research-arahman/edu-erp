-- ============================================================
-- COURSE PAYMENTS: installment payments against a course enrollment.
-- Each payment auto-posts to accounting (revenue 4300) when recorded,
-- reusing the idempotent/reversible link pattern (posted_transaction_id).
-- Full/Paid/Remaining are COMPUTED (agreed_fee vs sum of payments).
-- ============================================================

CREATE TABLE course_payments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id         uuid NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  amount                numeric NOT NULL CHECK (amount >= 0),
  currency              text DEFAULT 'BDT',
  payment_date          date NOT NULL DEFAULT current_date,
  payment_method        text,                 -- 'cash','bank_transfer','card','gateway'
  reference             text,                 -- receipt / invoice no
  notes                 text,

  -- accounting link (auto-posted revenue txn); ON DELETE SET NULL so reversal is clean
  posted_transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,

  recorded_by           uuid REFERENCES profiles(id),
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX idx_course_payments_enrollment ON course_payments(enrollment_id);
CREATE INDEX idx_course_payments_posted_txn ON course_payments(posted_transaction_id);