-- ============================================================
-- Link inquiries, students, and candidates to a referral partner.
-- Optional: not everyone comes from a partner (direct/walk-in are null).
-- ============================================================

ALTER TABLE inquiries
  ADD COLUMN referred_by_partner_id uuid REFERENCES referral_partners(id);

ALTER TABLE students
  ADD COLUMN referred_by_partner_id uuid REFERENCES referral_partners(id);

ALTER TABLE candidates
  ADD COLUMN referred_by_partner_id uuid REFERENCES referral_partners(id);

CREATE INDEX idx_inquiries_partner ON inquiries(referred_by_partner_id);
CREATE INDEX idx_students_partner ON students(referred_by_partner_id);
CREATE INDEX idx_candidates_partner ON candidates(referred_by_partner_id);