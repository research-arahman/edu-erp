-- ============================================================
-- Fix handle_new_user(): the SECURITY DEFINER function failed with
-- "relation profiles does not exist" because it had no search_path,
-- so it couldn't resolve the public.profiles table during signup.
-- Fix: schema-qualify the table and pin search_path.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New User'),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- The trigger itself is unchanged and still points at this function,
-- but recreate it defensively to be safe.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();