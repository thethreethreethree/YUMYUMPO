-- ============================================================
-- YUMYUMPO — Migration 022 · Make approve_application idempotent
-- If the application is already approved AND already has an
-- onboard_token + restaurant_id, return the existing values
-- instead of spawning a duplicate restaurant + overwriting the
-- token. Prevents the "admin clicked Approve twice, old claim
-- link no longer works" footgun.
-- ============================================================

DROP FUNCTION IF EXISTS public.approve_application(UUID);

CREATE OR REPLACE FUNCTION public.approve_application(p_app_id UUID)
RETURNS TABLE (out_slug TEXT, out_token TEXT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_app  restaurant_applications%ROWTYPE;
  v_slug TEXT;
  v_base TEXT;
  v_suffix INT := 0;
  v_token TEXT;
  v_rest_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT * INTO v_app FROM restaurant_applications WHERE id = p_app_id;
  IF v_app.id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  /* Idempotent fast-path: already onboarded → return existing token+slug. */
  IF v_app.status = 'approved'
     AND v_app.onboard_token IS NOT NULL
     AND v_app.restaurant_id IS NOT NULL THEN
    SELECT slug INTO v_slug FROM restaurants WHERE id = v_app.restaurant_id;
    IF v_slug IS NOT NULL THEN
      RETURN QUERY SELECT v_slug, v_app.onboard_token;
      RETURN;
    END IF;
    /* Else: restaurant row got deleted — fall through and re-spawn. */
  END IF;

  v_token := encode(extensions.gen_random_bytes(18), 'hex');

  /* Generate a unique slug from the restaurant name. */
  v_base := lower(regexp_replace(coalesce(v_app.restaurant_name, 'restaurant'), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base := trim(both '-' from v_base);
  v_slug := v_base;
  WHILE EXISTS (SELECT 1 FROM restaurants r WHERE r.slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_base || '-' || v_suffix;
  END LOOP;

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

SELECT pg_notify('pgrst', 'reload schema');
