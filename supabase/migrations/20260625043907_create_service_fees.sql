-- ============================================================
-- Service Fees: unified fee/commission tracker.
-- Covers BOTH directions and BOTH tracks:
--   • Service fee collected FROM a student (Japan university service, at COE/visa)
--   • Service fee collected FROM a referral partner (for students they send)
--   • (future) fees you PAY OUT to an agent (direction='outgoing')
-- Standalone tracker for now; accounting (transactions) tie-in is a later step.
-- ============================================================

CREATE TABLE service_fees (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Direction of money relative to your company
  direction     text NOT NULL DEFAULT 'incoming',  -- 'incoming' (you receive) | 'outgoing' (you pay)

  -- Who pays / who it relates to
  payer_type    text,                 -- 'partner' | 'student' | 'other'
  partner_id    uuid REFERENCES referral_partners(id),
  student_id    uuid REFERENCES students(id),
  candidate_id  uuid REFERENCES candidates(id),

  -- Amount
  amount        numeric NOT NULL CHECK (amount >= 0),
  currency      text DEFAULT 'BDT',

  -- When/why it's triggered
  milestone     text,                 -- 'on_referral','on_coe','on_visa','on_enrollment','on_placement','custom'
  description   text,

  -- Lifecycle
  status        text NOT NULL DEFAULT 'pending',  -- 'pending','invoiced','paid','cancelled'
  due_date      date,
  paid_date     date,
  notes         text,

  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),

  CONSTRAINT valid_fee_direction CHECK (direction IN ('incoming','outgoing')),
  CONSTRAINT valid_fee_payer_type CHECK (payer_type IN ('partner','student','other') OR payer_type IS NULL),
  CONSTRAINT valid_fee_status CHECK (status IN ('pending','invoiced','paid','cancelled'))
);

CREATE INDEX idx_fees_partner ON service_fees(partner_id);
CREATE INDEX idx_fees_student ON service_fees(student_id);
CREATE INDEX idx_fees_candidate ON service_fees(candidate_id);
CREATE INDEX idx_fees_status ON service_fees(status);
CREATE INDEX idx_fees_direction ON service_fees(direction);

-- RLS: financially sensitive — restrict to finance roles, like the accounting tables.
-- Reuses can_view_accounting() (owner, manager, accountant). Only owner+manager delete.
ALTER TABLE service_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY fees_select ON service_fees FOR SELECT TO authenticated USING (can_view_accounting());
CREATE POLICY fees_insert ON service_fees FOR INSERT TO authenticated WITH CHECK (can_view_accounting());
CREATE POLICY fees_update ON service_fees FOR UPDATE TO authenticated USING (can_view_accounting());
CREATE POLICY fees_delete ON service_fees FOR DELETE TO authenticated USING (can_delete());