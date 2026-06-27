-- ============================================================
-- Drop the course-payment reversal trigger. Its DELETE on transactions
-- was being silently filtered (0 rows) when invoked via cascade, so it
-- did not reliably reverse accounting. Reversal is instead handled
-- explicitly in the Python delete handlers using the service-role client
-- (which is proven to delete transactions reliably).
-- ============================================================

DROP TRIGGER IF EXISTS trg_reverse_course_payment_txn ON course_payments;
DROP FUNCTION IF EXISTS reverse_course_payment_txn();