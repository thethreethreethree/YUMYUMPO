-- ============================================================
-- YUMYUMPO — Migration 013 · Security & integrity hardening
--   1. Pin search_path = public, auth on every SECURITY DEFINER
--      function so they stop breaking when called from another
--      schema (root cause of the recent "profiles does not exist"
--      signup failure).
--   2. Introduce `save_owner_restaurant(jsonb)` — a single
--      transactional RPC that writes restaurant + hours + menu +
--      tags atomically. The owner dashboard switches to this so a
--      mid-save failure can't half-wipe data.
-- ============================================================

-- ── 1. search_path hardening ──────────────────────────────
ALTER FUNCTION public.handle_new_user()                 SET search_path = public, auth;
ALTER FUNCTION public.is_admin()                        SET search_path = public, auth;
ALTER FUNCTION public.claim_pending_restaurants()       SET search_path = public, auth;
ALTER FUNCTION public.claim_on_restaurant_email_set()   SET search_path = public, auth;
ALTER FUNCTION public.get_my_restaurant()               SET search_path = public, auth;
ALTER FUNCTION public.owns_restaurant(UUID)             SET search_path = public, auth;
ALTER FUNCTION public.restaurant_buzz_tiers()           SET search_path = public, auth;
ALTER FUNCTION public.trending_this_week(INTEGER)       SET search_path = public, auth;
ALTER FUNCTION public.people_also_saved(TEXT, INTEGER)  SET search_path = public, auth;
ALTER FUNCTION public.activity_by_location(INTEGER)     SET search_path = public, auth;
ALTER FUNCTION public.set_reaction(TEXT, TEXT)          SET search_path = public, auth;
ALTER FUNCTION public.get_reactions(TEXT)               SET search_path = public, auth;
-- Optional helpers that may or may not exist depending on which migrations ran
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_homepage_stats') THEN
    EXECUTE 'ALTER FUNCTION public.get_homepage_stats() SET search_path = public, auth';
  END IF;
END $$;


-- ── 2. Transactional owner save RPC ───────────────────────
-- Payload shape (jsonb):
--   {
--     "restaurant_id": "<uuid>",
--     "fields":        {<column>:<value>, ...},
--     "hours":         [{day_of_week, open_time, close_time, is_closed}, ...],
--     "categories":    [{name, sort_order, items: [{name, description, price, price_note, image_url, gallery_urls, tags, sort_order, is_available}, ...]}],
--     "vibe_tags":     ["Local Favorite", ...]
--   }
-- The whole body runs in one Postgres transaction — if any step errors,
-- nothing is committed and the owner's previous state is preserved.

CREATE OR REPLACE FUNCTION public.save_owner_restaurant(payload JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_rest_id   UUID := (payload->>'restaurant_id')::UUID;
  v_can_edit  BOOLEAN;
  v_cat       JSONB;
  v_item      JSONB;
  v_cat_id    UUID;
  v_tag       TEXT;
  v_ci        INT := 0;
  v_ii        INT := 0;
BEGIN
  IF v_rest_id IS NULL THEN
    RAISE EXCEPTION 'restaurant_id required';
  END IF;

  -- Authorisation: owner OR admin
  SELECT (
    EXISTS (SELECT 1 FROM restaurants WHERE id = v_rest_id AND owner_user_id = auth.uid())
    OR is_admin()
  ) INTO v_can_edit;
  IF NOT v_can_edit THEN
    RAISE EXCEPTION 'Not allowed to edit this restaurant';
  END IF;

  -- 1) Restaurant fields (whitelist via the payload's "fields" object)
  IF payload ? 'fields' THEN
    UPDATE restaurants r
       SET
         name              = COALESCE(payload->'fields'->>'name', r.name),
         cuisine_type      = COALESCE(payload->'fields'->>'cuisine_type', r.cuisine_type),
         tagline           =          payload->'fields'->>'tagline',
         description       =          payload->'fields'->>'description',
         location          =          payload->'fields'->>'location',
         address           =          payload->'fields'->>'address',
         latitude          =  NULLIF(payload->'fields'->>'latitude','')::NUMERIC,
         longitude         =  NULLIF(payload->'fields'->>'longitude','')::NUMERIC,
         google_rating     =  NULLIF(payload->'fields'->>'google_rating','')::NUMERIC,
         review_count      =  NULLIF(payload->'fields'->>'review_count','')::INTEGER,
         phone             =          payload->'fields'->>'phone',
         website_url       =          payload->'fields'->>'website_url',
         whatsapp_url      =          payload->'fields'->>'whatsapp_url',
         instagram_url     =          payload->'fields'->>'instagram_url',
         facebook_url      =          payload->'fields'->>'facebook_url',
         messenger_url     =          payload->'fields'->>'messenger_url',
         map_embed_url     =          payload->'fields'->>'map_embed_url',
         directions_url    =          payload->'fields'->>'directions_url',
         cover_image_url   =          payload->'fields'->>'cover_image_url',
         logo_image_url    =          payload->'fields'->>'logo_image_url',
         gallery_urls      = CASE WHEN payload->'fields' ? 'gallery_urls'
                                  THEN ARRAY(SELECT jsonb_array_elements_text(payload->'fields'->'gallery_urls'))
                                  ELSE r.gallery_urls END,
         food_gallery_urls = CASE WHEN payload->'fields' ? 'food_gallery_urls'
                                  THEN ARRAY(SELECT jsonb_array_elements_text(payload->'fields'->'food_gallery_urls'))
                                  ELSE r.food_gallery_urls END,
         updated_at        = NOW()
     WHERE r.id = v_rest_id;
  END IF;

  -- 2) Hours wipe + reinsert
  IF payload ? 'hours' THEN
    DELETE FROM operating_hours WHERE restaurant_id = v_rest_id;
    INSERT INTO operating_hours (restaurant_id, day_of_week, open_time, close_time, is_closed)
    SELECT
      v_rest_id,
      h->>'day_of_week',
      NULLIF(h->>'open_time','')::TIME,
      NULLIF(h->>'close_time','')::TIME,
      COALESCE((h->>'is_closed')::BOOLEAN, FALSE)
    FROM jsonb_array_elements(payload->'hours') AS h;
  END IF;

  -- 3) Menu wipe + reinsert
  IF payload ? 'categories' THEN
    DELETE FROM menu_items      WHERE restaurant_id = v_rest_id;
    DELETE FROM menu_categories WHERE restaurant_id = v_rest_id;
    v_ci := 0;
    FOR v_cat IN SELECT * FROM jsonb_array_elements(payload->'categories') LOOP
      IF COALESCE(v_cat->>'name','') = '' THEN
        v_ci := v_ci + 1;
        CONTINUE;
      END IF;
      INSERT INTO menu_categories (restaurant_id, name, sort_order)
        VALUES (v_rest_id, v_cat->>'name', v_ci)
        RETURNING id INTO v_cat_id;
      v_ii := 0;
      FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_cat->'items','[]'::jsonb)) LOOP
        IF COALESCE(v_item->>'name','') = '' THEN
          v_ii := v_ii + 1;
          CONTINUE;
        END IF;
        INSERT INTO menu_items (
          restaurant_id, menu_category_id, name, description,
          price, price_note, image_url, gallery_urls, tags,
          sort_order, is_available
        ) VALUES (
          v_rest_id, v_cat_id,
          v_item->>'name',
          v_item->>'description',
          v_item->>'price',
          v_item->>'price_note',
          v_item->>'image_url',
          CASE WHEN v_item ? 'gallery_urls'
               THEN ARRAY(SELECT jsonb_array_elements_text(v_item->'gallery_urls'))
               ELSE '{}'::TEXT[] END,
          CASE WHEN v_item ? 'tags'
               THEN ARRAY(SELECT jsonb_array_elements_text(v_item->'tags'))
               ELSE '{}'::TEXT[] END,
          v_ii,
          COALESCE((v_item->>'is_available')::BOOLEAN, TRUE)
        );
        v_ii := v_ii + 1;
      END LOOP;
      v_ci := v_ci + 1;
    END LOOP;
  END IF;

  -- 4) Vibe tags wipe + reinsert
  IF payload ? 'vibe_tags' THEN
    DELETE FROM restaurant_tags WHERE restaurant_id = v_rest_id;
    INSERT INTO restaurant_tags (restaurant_id, tag_name)
    SELECT v_rest_id, tag
    FROM jsonb_array_elements_text(payload->'vibe_tags') AS tag
    WHERE tag <> '';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_owner_restaurant(JSONB) TO authenticated;

SELECT pg_notify('pgrst', 'reload schema');
