-- ============================================================
-- Staff Profiles: extends Supabase auth.users
-- ============================================================

CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  full_name       text NOT NULL,
  email           text,
  phone           text,

  -- Permission tier (controls what they can do)
  role            user_role NOT NULL DEFAULT 'staff',

  -- Job title (display/filtering only, NOT permissions)
  -- e.g. 'Counselor','Business Developer','Marketing Officer',
  --      'Admission Officer','Application Officer','Language Instructor'
  position        text,

  -- Team grouping: 'counseling','application','admission','marketing', etc.
  team            text,

  -- Reporting line: which team leader this person reports to
  team_leader_id  uuid REFERENCES profiles(id),

  -- Status
  is_active       boolean DEFAULT true,

  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_team ON profiles(team);
CREATE INDEX idx_profiles_leader ON profiles(team_leader_id);

-- ============================================================
-- Auto-create a profile row whenever a new auth user signs up
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New User'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();