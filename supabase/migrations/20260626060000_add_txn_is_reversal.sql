-- Add is_reversal flag to transactions.
-- When true: the stored direction is the FLIPPED value of what account_type normally implies,
-- and the summary counts the amount AGAINST that account's total
-- (refund on revenue reduces total_revenue; reversal on expense reduces total_expenses).
ALTER TABLE transactions ADD COLUMN is_reversal boolean DEFAULT false;
