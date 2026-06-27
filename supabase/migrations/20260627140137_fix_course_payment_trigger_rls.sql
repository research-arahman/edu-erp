-- ============================================================
-- Fix: the course-payment reversal trigger's DELETE on transactions
-- was being silently blocked by RLS on the transactions table when
-- invoked via cascade (the trigger ran in a context where the RLS
-- DELETE policy evaluated false, deleting 0 rows).
--
-- Fix by owning the SECURITY DEFINER function as `postgres` (which has
-- BYPASSRLS in Supabase) so its DELETE is not filtered by RLS, AND by
-- explicitly disabling row_security within the function body.
-- ============================================================

CREATE OR REPLACE FUNCTION reverse_course_payment_txn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF OLD.posted_transaction_id IS NOT NULL THEN
    DELETE FROM public.transactions WHERE id = OLD.posted_transaction_id;
  END IF;
  RETURN OLD;
END;
$$;

-- Ensure the function runs as a role that bypasses RLS.
ALTER FUNCTION reverse_course_payment_txn() OWNER TO postgres;

-- Recreate the trigger (function body changed; trigger binding stays).
DROP TRIGGER IF EXISTS trg_reverse_course_payment_txn ON course_payments;
CREATE TRIGGER trg_reverse_course_payment_txn
  BEFORE DELETE ON course_payments
  FOR EACH ROW
  EXECUTE FUNCTION reverse_course_payment_txn();