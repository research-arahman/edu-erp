-- ============================================================
-- Bulletproof accounting reversal for course payments.
-- When a course_payment row is deleted by ANY path (direct delete,
-- enrollment cascade, or course_student cascade), delete its linked
-- accounting transaction so no orphaned revenue remains.
-- A DB-level BEFORE DELETE trigger guarantees this even when the
-- Python layer is bypassed by a cascade.
-- ============================================================

CREATE OR REPLACE FUNCTION reverse_course_payment_txn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.posted_transaction_id IS NOT NULL THEN
    DELETE FROM public.transactions WHERE id = OLD.posted_transaction_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_reverse_course_payment_txn ON course_payments;

CREATE TRIGGER trg_reverse_course_payment_txn
  BEFORE DELETE ON course_payments
  FOR EACH ROW
  EXECUTE FUNCTION reverse_course_payment_txn();