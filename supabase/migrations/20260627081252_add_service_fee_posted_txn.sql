-- ============================================================
-- Link a service_fee to the accounting transaction created when it
-- was marked 'paid'. Prevents double-posting and enables reversal
-- if a paid fee is later un-marked.
-- ============================================================

ALTER TABLE service_fees
  ADD COLUMN posted_transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL;

CREATE INDEX idx_service_fees_posted_txn ON service_fees(posted_transaction_id);