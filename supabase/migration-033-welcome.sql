-- ============================================================
-- YUMYUMPO — Migration 033 · Partner welcome page
-- get_welcome_info() lets the public /welcome page greet an
-- approved applicant by name. The unguessable onboard_token is
-- the access control, so this is anon-readable.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_welcome_info(p_token TEXT)
RETURNS TABLE (
  restaurant_name TEXT,
  owner_name      TEXT,
  status          TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT restaurant_name, owner_name, status
  FROM restaurant_applications
  WHERE onboard_token = p_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_welcome_info(TEXT) TO anon, authenticated;

SELECT pg_notify('pgrst', 'reload schema');
