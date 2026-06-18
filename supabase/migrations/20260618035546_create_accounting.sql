-- ============================================================
-- Accounting Module: Chart of Accounts, Transactions,
-- Investments, Consultant Commissions
-- Custom-built. Gateway-ready (Stripe/PayPal fields present but optional).
-- ============================================================

-- ---------- CHART OF ACCOUNTS ----------
-- Hierarchical CoA. parent_code lets sub-accounts nest under headers.
CREATE TABLE accounts (
  code          int PRIMARY KEY,          -- e.g. 1110, 4100 (your CoA codes)
  name          text NOT NULL,
  account_type  text NOT NULL,            -- 'asset','liability','equity','revenue','cogs','expense'
  parent_code   int REFERENCES accounts(code),
  is_header     boolean DEFAULT false,    -- true for 1000/1100 group rows, false for postable accounts
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  CONSTRAINT valid_acct_type CHECK (account_type IN
    ('asset','liability','equity','revenue','cogs','expense'))
);

-- ---------- TRANSACTIONS ----------
-- Every money movement. Gateway fields are nullable until you register Stripe/PayPal.
CREATE TABLE transactions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_date          date NOT NULL DEFAULT current_date,
  account_code      int NOT NULL REFERENCES accounts(code),
  direction         text NOT NULL,        -- 'debit' | 'credit'
  amount            numeric NOT NULL CHECK (amount >= 0),
  currency          text DEFAULT 'BDT',
  description       text,
  reference         text,                 -- invoice/receipt no

  -- Payment method
  payment_method    text,                 -- 'bank_transfer','cash','card','gateway'

  -- Gateway-ready fields (fill later when Stripe/PayPal is set up)
  gateway_name      text,                 -- 'stripe','paypal', null for now
  gateway_txn_id    text,                 -- gateway's transaction reference
  gateway_fee       numeric,              -- processing fee charged by gateway
  settlement_currency text,               -- currency actually settled to your account

  -- Links
  student_id        uuid REFERENCES students(id),
  recorded_by       uuid REFERENCES profiles(id),

  created_at        timestamptz DEFAULT now(),
  CONSTRAINT valid_direction CHECK (direction IN ('debit','credit'))
);

-- ---------- INVESTMENTS ----------
CREATE TABLE investments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_name   text NOT NULL,
  amount          numeric NOT NULL CHECK (amount >= 0),
  currency        text DEFAULT 'BDT',
  invest_date     date NOT NULL DEFAULT current_date,
  investment_type text,                   -- 'initial_capital','additional','loan'
  notes           text,
  recorded_by     uuid REFERENCES profiles(id),
  created_at      timestamptz DEFAULT now()
);

-- ---------- CONSULTANT COMMISSIONS ----------
-- Foundation for the commission engine (calculation logic comes later in backend).
CREATE TABLE commissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id   uuid NOT NULL REFERENCES profiles(id),
  student_id      uuid REFERENCES students(id),
  application_id  uuid REFERENCES applications(id),

  basis           text,                   -- 'fixed' | 'percentage'
  rate            numeric,                -- fixed amount OR percentage value
  computed_amount numeric,                -- final payout amount
  currency        text DEFAULT 'BDT',

  status          text DEFAULT 'pending', -- 'pending','approved','paid'
  earned_on       date,
  paid_on         date,
  notes           text,

  recorded_by     uuid REFERENCES profiles(id),
  created_at      timestamptz DEFAULT now(),
  CONSTRAINT valid_comm_status CHECK (status IN ('pending','approved','paid'))
);

CREATE INDEX idx_txn_date ON transactions(txn_date DESC);
CREATE INDEX idx_txn_account ON transactions(account_code);
CREATE INDEX idx_txn_student ON transactions(student_id);
CREATE INDEX idx_invest_date ON investments(invest_date DESC);
CREATE INDEX idx_comm_consultant ON commissions(consultant_id);
CREATE INDEX idx_comm_status ON commissions(status);

-- ============================================================
-- Seed the Chart of Accounts (your structure: 1000-6400)
-- ============================================================
INSERT INTO accounts (code, name, account_type, parent_code, is_header) VALUES
  -- ASSETS
  (1000, 'ASSETS', 'asset', NULL, true),
  (1100, 'Cash and Cash Equivalents', 'asset', 1000, true),
  (1110, 'Main Operating Bank Account', 'asset', 1100, false),
  (1120, 'Merchant/Online Payment Gateway', 'asset', 1100, false),
  (1200, 'Accounts Receivable', 'asset', 1000, false),
  (1300, 'Prepayments', 'asset', 1000, false),
  -- LIABILITIES
  (2000, 'LIABILITIES', 'liability', NULL, true),
  (2100, 'Accounts Payable', 'liability', 2000, false),
  (2200, 'Accrued Expenses', 'liability', 2000, false),
  (2300, 'Deferred Revenue', 'liability', 2000, false),
  -- EQUITY
  (3000, 'EQUITY', 'equity', NULL, true),
  (3100, 'Owner''s Capital', 'equity', 3000, false),
  (3200, 'Retained Earnings', 'equity', 3000, false),
  -- REVENUE
  (4000, 'REVENUE', 'revenue', NULL, true),
  (4100, 'University Application Consulting Fees', 'revenue', 4000, false),
  (4200, 'Visa & Documentation Support Services', 'revenue', 4000, false),
  (4300, 'Test Preparation Course Registration', 'revenue', 4000, false),
  (4400, 'Institutional Partner Commissions', 'revenue', 4000, false),
  -- COGS
  (5000, 'COST OF GOODS SOLD', 'cogs', NULL, true),
  (5100, 'Freelance/External Consultant Fees', 'cogs', 5000, false),
  (5200, 'Student Assessment & Mock Exam Portal Licenses', 'cogs', 5000, false),
  -- OPEX
  (6000, 'OPERATING EXPENSES', 'expense', NULL, true),
  (6100, 'Marketing & Lead Generation', 'expense', 6000, false),
  (6200, 'Software & Subscriptions', 'expense', 6000, false),
  (6300, 'Office Rent & Utilities', 'expense', 6000, false),
  (6400, 'Salaries & Employee Benefits', 'expense', 6000, false);

-- ============================================================
-- RLS: accounting is sensitive — owner, manager, accountant only.
-- ============================================================
CREATE OR REPLACE FUNCTION can_view_accounting()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT current_user_role() IN ('owner','manager','accountant');
$$;

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY accounts_select ON accounts FOR SELECT TO authenticated USING (can_view_accounting());
CREATE POLICY accounts_insert ON accounts FOR INSERT TO authenticated WITH CHECK (can_view_accounting());
CREATE POLICY accounts_update ON accounts FOR UPDATE TO authenticated USING (can_view_accounting());
CREATE POLICY accounts_delete ON accounts FOR DELETE TO authenticated USING (can_delete());

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY txn_select ON transactions FOR SELECT TO authenticated USING (can_view_accounting());
CREATE POLICY txn_insert ON transactions FOR INSERT TO authenticated WITH CHECK (can_view_accounting());
CREATE POLICY txn_update ON transactions FOR UPDATE TO authenticated USING (can_view_accounting());
CREATE POLICY txn_delete ON transactions FOR DELETE TO authenticated USING (can_delete());

ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY invest_select ON investments FOR SELECT TO authenticated USING (can_view_accounting());
CREATE POLICY invest_insert ON investments FOR INSERT TO authenticated WITH CHECK (can_view_accounting());
CREATE POLICY invest_update ON investments FOR UPDATE TO authenticated USING (can_view_accounting());
CREATE POLICY invest_delete ON investments FOR DELETE TO authenticated USING (can_delete());

ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY comm_select ON commissions FOR SELECT TO authenticated USING (can_view_accounting());
CREATE POLICY comm_insert ON commissions FOR INSERT TO authenticated WITH CHECK (can_view_accounting());
CREATE POLICY comm_update ON commissions FOR UPDATE TO authenticated USING (can_view_accounting());
CREATE POLICY comm_delete ON commissions FOR DELETE TO authenticated USING (can_delete());