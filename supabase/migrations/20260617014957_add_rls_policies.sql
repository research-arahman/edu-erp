-- ============================================================
-- Row-Level Security: permission enforcement
-- Rule: owner + manager can DELETE. Everyone else: SELECT/INSERT/UPDATE only.
-- ============================================================

-- Helper: get the current user's role from their profile
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Helper: can the current user delete? (owner or manager only)
CREATE OR REPLACE FUNCTION can_delete()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT current_user_role() IN ('owner', 'manager');
$$;

-- ============================================================
-- Enable RLS and apply policies to each data table
-- ============================================================

-- ---------- PROFILES ----------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY profiles_insert ON profiles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY profiles_update ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR current_user_role() IN ('owner','manager'));

CREATE POLICY profiles_delete ON profiles
  FOR DELETE TO authenticated USING (can_delete());

-- ---------- STUDENTS ----------
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY students_select ON students
  FOR SELECT TO authenticated USING (true);

CREATE POLICY students_insert ON students
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY students_update ON students
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY students_delete ON students
  FOR DELETE TO authenticated USING (can_delete());

-- ---------- COUNTRIES ----------
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY countries_select ON countries FOR SELECT TO authenticated USING (true);
CREATE POLICY countries_insert ON countries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY countries_update ON countries FOR UPDATE TO authenticated USING (true);
CREATE POLICY countries_delete ON countries FOR DELETE TO authenticated USING (can_delete());

-- ---------- INSTITUTES ----------
ALTER TABLE institutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY institutes_select ON institutes FOR SELECT TO authenticated USING (true);
CREATE POLICY institutes_insert ON institutes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY institutes_update ON institutes FOR UPDATE TO authenticated USING (true);
CREATE POLICY institutes_delete ON institutes FOR DELETE TO authenticated USING (can_delete());

-- ---------- PROGRAMS ----------
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY programs_select ON programs FOR SELECT TO authenticated USING (true);
CREATE POLICY programs_insert ON programs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY programs_update ON programs FOR UPDATE TO authenticated USING (true);
CREATE POLICY programs_delete ON programs FOR DELETE TO authenticated USING (can_delete());

-- ---------- PROGRAM_SESSIONS ----------
ALTER TABLE program_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sessions_select ON program_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY sessions_insert ON program_sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY sessions_update ON program_sessions FOR UPDATE TO authenticated USING (true);
CREATE POLICY sessions_delete ON program_sessions FOR DELETE TO authenticated USING (can_delete());

-- ---------- ADMISSION_REQUIREMENTS ----------
ALTER TABLE admission_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY req_select ON admission_requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY req_insert ON admission_requirements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY req_update ON admission_requirements FOR UPDATE TO authenticated USING (true);
CREATE POLICY req_delete ON admission_requirements FOR DELETE TO authenticated USING (can_delete());