-- ============================================================
-- YUMYUMPO — Migration 021 · Approve-and-Onboard claim flow
-- After admin reviews an application, one RPC:
--   1. Creates the restaurant draft from the application data
--   2. Stamps owner_email so the auto-claim trigger links the
--      new account to it on sign-up
--   3. Returns the slug + claim token URL for the admin to share
-- And a public-readable RPC the claim page uses to fetch a small
-- summary by token (so an unsigned applicant can see status).
-- ============================================================

ALTER TABLE restaurant_applications
  ADD COLUMN IF NOT EXISTS onboard_token TEXT,
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS apps_onboard_token_uidx
  ON restaurant_applications(onboard_token) WHERE onboard_token IS NOT NULL;


-- Admin-only: approve an application → spawn a restaurant draft + claim token.
CREATE OR REPLACE FUNCTION public.approve_application(p_app_id UUID)
RETURNS TABLE (slug TEXT, onboard_token TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_app restaurant_applications%ROWTYPE;
  v_slug TEXT;
  v_base TEXT;
  v_suffix INT := 0;
  v_token TEXT := encode(gen_random_bytes(18), 'hex');
  v_rest_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT * INTO v_app FROM restaurant_applications WHERE id = p_app_id;
  IF v_app.id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  /* Generate a unique slug from the restaurant name. */
  v_base := lower(regexp_replace(coalesce(v_app.restaurant_name, 'restaurant'), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base := trim(both '-' from v_base);
  v_slug := v_base;
  WHILE EXISTS (SELECT 1 FROM restaurants WHERE slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_base || '-' || v_suffix;
  END LOOP;

  /* Spawn the restaurant draft. Owner_email triggers the auto-claim
     on sign-up via migration 006/009. has_yumyumpo_site = true if the
     applicant requested a Premium site (needs_website = TRUE); admin
     can flip this later if they want only an external listing. */
  INSERT INTO restaurants (
    slug, name, cuisine_type, location, description,
    website_url, has_yumyumpo_site, owner_email,
    is_active, is_demo, accepting_orders
  ) VALUES (
    v_slug,
    v_app.restaurant_name,
    NULLIF(v_app.cuisine_type, ''),
    NULLIF(v_app.location, ''),
    NULLIF(v_app.about, ''),
    NULLIF(v_app.existing_website, ''),
    COALESCE(v_app.needs_website, FALSE),
    lower(v_app.contact_email),
    TRUE,
    FALSE,
    TRUE
  )
  RETURNING id INTO v_rest_id;

  /* Mark the application approved + store the claim token + restaurant id. */
  UPDATE restaurant_applications
     SET status        = 'approved',
         onboard_token = v_token,
         restaurant_id = v_rest_id,
         reviewed_by   = auth.uid(),
         reviewed_at   = NOW()
   WHERE id = p_app_id;

  RETURN QUERY SELECT v_slug, v_token;
END;
$$;
GRANT EXECUTE ON FUNCTION public.approve_application(UUID) TO authenticated;


-- Public RPC: claim page reads the application + restaurant by token.
-- Anon-readable because the unguessable token is the access control.
CREATE OR REPLACE FUNCTION public.get_application_by_token(p_token TEXT)
RETURNS TABLE (
  app_id            UUID,
  status            TEXT,
  restaurant_name   TEXT,
  contact_email     TEXT,
  cuisine_type      TEXT,
  location          TEXT,
  restaurant_id     UUID,
  restaurant_slug   TEXT,
  has_yumyumpo_site BOOLEAN,
  owner_user_id     UUID
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    a.id, a.status, a.restaurant_name, a.contact_email, a.cuisine_type, a.location,
    r.id, r.slug, r.has_yumyumpo_site, r.owner_user_id
  FROM restaurant_applications a
  LEFT JOIN restaurants r ON r.id = a.restaurant_id
  WHERE a.onboard_token = p_token
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_application_by_token(TEXT) TO anon, authenticated;


-- Public RPC: check application status by email (footer self-service).
CREATE OR REPLACE FUNCTION public.get_my_application_status(p_email TEXT)
RETURNS TABLE (
  status            TEXT,
  restaurant_name   TEXT,
  created_at        TIMESTAMPTZ,
  onboard_token     TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT status, restaurant_name, created_at, onboard_token
  FROM restaurant_applications
  WHERE lower(contact_email) = lower(p_email)
  ORDER BY created_at DESC
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_application_status(TEXT) TO anon, authenticated;


SELECT pg_notify('pgrst', 'reload schema');
