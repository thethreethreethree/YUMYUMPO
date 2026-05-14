-- ============================================================
-- YUMYUMPO — Migration 015 · Harden save_owner_restaurant
-- Two issues from the regression audit:
--   1. Empty-string `name` slipped past COALESCE (jsonb ->> '' is
--      not NULL, so the fallback to existing value was skipped).
--   2. Every field was unconditionally set to NULL when its key
--      was missing from `fields`, making partial saves unsafe.
-- Both fixed by switching to:
--    CASE WHEN payload->'fields' ? '<key>'
--         THEN NULLIF(payload->'fields'->>'<key>', '')   -- text cols
--         ELSE r.<key> END
-- Required columns (name, cuisine_type) layer in COALESCE so the
-- old value wins instead of NULL.
-- ============================================================

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
  v_ci        INT := 0;
  v_ii        INT := 0;
  v_fields    JSONB := payload->'fields';
BEGIN
  IF v_rest_id IS NULL THEN
    RAISE EXCEPTION 'restaurant_id required';
  END IF;

  SELECT (
    EXISTS (SELECT 1 FROM restaurants WHERE id = v_rest_id AND owner_user_id = auth.uid())
    OR is_admin()
  ) INTO v_can_edit;
  IF NOT v_can_edit THEN
    RAISE EXCEPTION 'Not allowed to edit this restaurant';
  END IF;

  -- 1) Restaurant fields. Each column updates ONLY when the client
  -- explicitly included its key in `fields` — preserves data on
  -- partial saves and treats '' as a no-op for required fields.
  IF v_fields IS NOT NULL THEN
    UPDATE restaurants r SET
      name              = CASE WHEN v_fields ? 'name'              THEN COALESCE(NULLIF(v_fields->>'name',''), r.name) ELSE r.name END,
      cuisine_type      = CASE WHEN v_fields ? 'cuisine_type'      THEN COALESCE(NULLIF(v_fields->>'cuisine_type',''), r.cuisine_type) ELSE r.cuisine_type END,
      tagline           = CASE WHEN v_fields ? 'tagline'           THEN NULLIF(v_fields->>'tagline','')           ELSE r.tagline           END,
      description       = CASE WHEN v_fields ? 'description'       THEN NULLIF(v_fields->>'description','')       ELSE r.description       END,
      location          = CASE WHEN v_fields ? 'location'          THEN NULLIF(v_fields->>'location','')          ELSE r.location          END,
      address           = CASE WHEN v_fields ? 'address'           THEN NULLIF(v_fields->>'address','')           ELSE r.address           END,
      latitude          = CASE WHEN v_fields ? 'latitude'          THEN NULLIF(v_fields->>'latitude','')::NUMERIC ELSE r.latitude          END,
      longitude         = CASE WHEN v_fields ? 'longitude'         THEN NULLIF(v_fields->>'longitude','')::NUMERIC ELSE r.longitude         END,
      google_rating     = CASE WHEN v_fields ? 'google_rating'     THEN NULLIF(v_fields->>'google_rating','')::NUMERIC ELSE r.google_rating END,
      review_count      = CASE WHEN v_fields ? 'review_count'      THEN NULLIF(v_fields->>'review_count','')::INTEGER  ELSE r.review_count  END,
      phone             = CASE WHEN v_fields ? 'phone'             THEN NULLIF(v_fields->>'phone','')             ELSE r.phone             END,
      website_url       = CASE WHEN v_fields ? 'website_url'       THEN NULLIF(v_fields->>'website_url','')       ELSE r.website_url       END,
      whatsapp_url      = CASE WHEN v_fields ? 'whatsapp_url'      THEN NULLIF(v_fields->>'whatsapp_url','')      ELSE r.whatsapp_url      END,
      instagram_url     = CASE WHEN v_fields ? 'instagram_url'     THEN NULLIF(v_fields->>'instagram_url','')     ELSE r.instagram_url     END,
      facebook_url      = CASE WHEN v_fields ? 'facebook_url'      THEN NULLIF(v_fields->>'facebook_url','')      ELSE r.facebook_url      END,
      messenger_url     = CASE WHEN v_fields ? 'messenger_url'     THEN NULLIF(v_fields->>'messenger_url','')     ELSE r.messenger_url     END,
      map_embed_url     = CASE WHEN v_fields ? 'map_embed_url'     THEN NULLIF(v_fields->>'map_embed_url','')     ELSE r.map_embed_url     END,
      directions_url    = CASE WHEN v_fields ? 'directions_url'    THEN NULLIF(v_fields->>'directions_url','')    ELSE r.directions_url    END,
      cover_image_url   = CASE WHEN v_fields ? 'cover_image_url'   THEN NULLIF(v_fields->>'cover_image_url','')   ELSE r.cover_image_url   END,
      logo_image_url    = CASE WHEN v_fields ? 'logo_image_url'    THEN NULLIF(v_fields->>'logo_image_url','')    ELSE r.logo_image_url    END,
      gallery_urls      = CASE WHEN v_fields ? 'gallery_urls'      THEN ARRAY(SELECT jsonb_array_elements_text(v_fields->'gallery_urls'))      ELSE r.gallery_urls      END,
      food_gallery_urls = CASE WHEN v_fields ? 'food_gallery_urls' THEN ARRAY(SELECT jsonb_array_elements_text(v_fields->'food_gallery_urls')) ELSE r.food_gallery_urls END,
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
          NULLIF(v_item->>'description',''),
          NULLIF(v_item->>'price',''),
          NULLIF(v_item->>'price_note',''),
          NULLIF(v_item->>'image_url',''),
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
