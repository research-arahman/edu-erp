-- ============================================================
-- Referral Partners (employment + education)
-- Ongoing partners who send students/candidates: other firms,
-- Japanese language centers in Bangladesh, individual agents.
-- Each has a default commission arrangement; specific fees are
-- recorded later in the service_fees table.
-- ============================================================

CREATE TABLE referral_partners (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  type              text,                 -- 'firm' | 'language_center' | 'individual'
  -- Contact
  contact_person    text,
  phone             text,
  email             text,
  address           text,
  -- Default commission/fee arrangement (specific fees can override in service_fees)
  commission_basis  text,                 -- 'percentage' | 'fixed'
  commission_rate   numeric,              -- percentage value OR fixed amount
  commission_currency text DEFAULT 'BDT',
  -- Misc
  notes             text,
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  CONSTRAINT valid_partner_type CHECK (type IN ('firm','language_center','individual') OR type IS NULL),
  CONSTRAINT valid_commission_basis CHECK (commission_basis IN ('percentage','fixed') OR commission_basis IS NULL)
);

CREATE INDEX idx_refpartners_type ON referral_partners(type);
CREATE INDEX idx_refpartners_active ON referral_partners(is_active);

-- RLS: all staff view/add/edit; only owner+manager delete (standard pattern).
ALTER TABLE referral_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY refpartners_select ON referral_partners FOR SELECT TO authenticated USING (true);
CREATE POLICY refpartners_insert ON referral_partners FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY refpartners_update ON referral_partners FOR UPDATE TO authenticated USING (true);
CREATE POLICY refpartners_delete ON referral_partners FOR DELETE TO authenticated USING (can_delete());